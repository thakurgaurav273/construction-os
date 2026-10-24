import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictException } from '@nestjs/common';
import type { ContractDirection } from '@prisma/client';
import type { PrismaService } from '../../src/database/prisma.service';
import { ClientsService } from '../../src/modules/billing/clients.service';
import { ContractItemsService } from '../../src/modules/billing/contract-items.service';
import { ContractsService } from '../../src/modules/billing/contracts.service';
import { RaBillHistoryService } from '../../src/modules/billing/ra-bill-history.service';
import { RaBillReceiptsService } from '../../src/modules/billing/ra-bill-receipts.service';
import { RaBillSettlementService } from '../../src/modules/billing/ra-bill-settlement.service';
import { RaBillTotalsService } from '../../src/modules/billing/ra-bill-totals.service';
import { RaBillWorkflowService } from '../../src/modules/billing/ra-bill-workflow.service';
import { RaBillsService } from '../../src/modules/billing/ra-bills.service';
import { MaterialRecoveryService } from '../../src/modules/billing/recovery/material-recovery.service';
import { RetentionService } from '../../src/modules/billing/retention.service';
import { BillingPayablesService } from '../../src/modules/finance/billing-payables.service';
import { FinanceHistoryService } from '../../src/modules/finance/finance-history.service';
import { PaymentsService } from '../../src/modules/finance/payments.service';
import { projectSpend } from '../../src/modules/finance/project-spend';
import { VendorsService } from '../../src/modules/procurement/vendors.service';
import { connectTestDatabase } from './support/test-database';
import { OrganizationFixture, createOrganization, createVendor } from './support/fixtures';

describe('reopening a certified RA bill', () => {
  let prisma: PrismaService;
  let contracts: ContractsService;
  let items: ContractItemsService;
  let bills: RaBillsService;
  let workflow: RaBillWorkflowService;
  let receipts: RaBillReceiptsService;
  let retention: RetentionService;
  let payments: PaymentsService;
  let org: OrganizationFixture;
  let vendorId: string;
  let clientId: string;

  before(async () => {
    prisma = await connectTestDatabase();
    const totals = new RaBillTotalsService();
    const history = new RaBillHistoryService();
    const financeHistory = new FinanceHistoryService(prisma);
    const payables = new BillingPayablesService(financeHistory);
    const clients = new ClientsService(prisma);
    retention = new RetentionService(prisma, payables);
    contracts = new ContractsService(prisma, clients, new VendorsService(prisma), retention, new MaterialRecoveryService(prisma, totals));
    items = new ContractItemsService(prisma, contracts, totals);
    bills = new RaBillsService(prisma, contracts, totals, history);
    workflow = new RaBillWorkflowService(prisma, bills, totals, new RaBillSettlementService(payables), payables, history);
    receipts = new RaBillReceiptsService(prisma, history);
    payments = new PaymentsService(prisma, financeHistory);
    org = await createOrganization(prisma, 'Billing Reopen');
    vendorId = await createVendor(prisma, org.organizationId, 'Ganesh Earthworks');
    clientId = (await clients.create(org.organizationId, org.owner.id, { name: 'Metro Rail Corp' })).id;
  });
  after(() => prisma.$disconnect());

  const today = new Date().toISOString().slice(0, 10);
  const reason = { note: 'Item 1 was measured on the wrong drawing' };

  /** A contract with one BOQ line (₹1,000 / cum) and 5% retention. */
  async function contractFor(direction: ContractDirection): Promise<string> {
    const contract = await contracts.create(org.organizationId, org.owner.id, {
      direction,
      projectId: org.projectId,
      ...(direction === 'CLIENT' ? { clientId } : { vendorId }),
      title: `${direction} earthwork`,
      adjustments: [{ label: 'Retention', effect: 'DEDUCT', calculation: 'PERCENT', value: 5, isRetention: true }],
    });
    await items.replaceItems(contract.id, org.organizationId, {
      items: [{ itemNo: '1', description: 'Excavation in hard rock', unit: 'cum', quantity: 500, rate: 1000 }],
    });
    return contract.id;
  }

  /** Prepared by the manager (10 cum, gross ₹10,000, net ₹9,500) and certified by the owner. */
  async function certifiedBill(contractId: string): Promise<string> {
    const bill = await bills.create(contractId, org.organizationId, org.manager.id, { periodFrom: today, periodTo: today });
    const itemId = bill.lines[0]?.contractItemId ?? (await prisma.contractItem.findFirstOrThrow({ where: { contractId } })).id;
    await bills.replaceMeasurements(bill.id, itemId, org.organizationId, { rows: [{ description: 'Cut 1', type: 'DIRECT', quantity: 10 }] });
    await workflow.submit(bill.id, org.organizationId, org.manager.id);
    await workflow.certify(bill.id, org.organizationId, org.owner.id, {});
    return bill.id;
  }

  const spentOnProject = async (): Promise<number> => (await projectSpend(prisma, org.organizationId, [org.projectId])).get(org.projectId) ?? 0;

  it('withdraws a subcontract certification, cancels its vendor bill and raises a fresh one when certified again', async () => {
    const billId = await certifiedBill(await contractFor('SUBCONTRACT'));
    const first = await prisma.invoice.findUniqueOrThrow({ where: { raBillId: billId } });
    assert.equal(first.status, 'APPROVED');
    assert.equal(first.totalAmount.toNumber(), 9_500);
    const spentBefore = await spentOnProject();

    const reopened = await workflow.reopen(billId, org.organizationId, org.owner.id, reason);
    assert.equal(reopened.status, 'CHANGES_REQUESTED');
    const stored = await prisma.raBill.findUniqueOrThrow({ where: { id: billId }, include: { lines: true } });
    assert.equal(stored.certifiedAt, null);
    assert.equal(stored.dueDate, null);
    assert.equal(stored.lines[0].certifiedQuantity, null);
    assert.equal(stored.reviewNote, reason.note);

    const withdrawn = await prisma.invoice.findUniqueOrThrow({ where: { id: first.id } });
    assert.equal(withdrawn.status, 'CANCELLED');
    assert.equal(withdrawn.raBillId, null);
    assert.equal(await spentOnProject(), spentBefore - 9_500, 'a cancelled vendor bill no longer counts as spent');

    await workflow.submit(billId, org.organizationId, org.manager.id);
    await workflow.certify(billId, org.organizationId, org.owner.id, {});
    const second = await prisma.invoice.findUniqueOrThrow({ where: { raBillId: billId } });
    assert.notEqual(second.id, first.id);
    assert.notEqual(second.invoiceNumber, first.invoiceNumber, 'the withdrawn bill keeps its number');
    assert.equal(second.status, 'APPROVED');
    assert.equal(await spentOnProject(), spentBefore);
  });

  it('refuses while a payment is waiting against the vendor bill, and allows it once the payment is cancelled', async () => {
    const billId = await certifiedBill(await contractFor('SUBCONTRACT'));
    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { raBillId: billId } });
    const payment = await payments.create(org.organizationId, org.manager.id, { invoiceId: invoice.id, amount: 1_000 });

    await assert.rejects(workflow.reopen(billId, org.organizationId, org.owner.id, reason), ConflictException);
    assert.equal((await prisma.raBill.findUniqueOrThrow({ where: { id: billId } })).status, 'CERTIFIED', 'nothing changes when refused');
    assert.equal((await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).status, 'APPROVED');

    await payments.cancel(payment.id, org.organizationId, org.manager.id, {});
    assert.equal((await workflow.reopen(billId, org.organizationId, org.owner.id, reason)).status, 'CHANGES_REQUESTED');
  });

  it('refuses a client bill with money received until the receipt is voided', async () => {
    const billId = await certifiedBill(await contractFor('CLIENT'));
    assert.equal(await prisma.invoice.count({ where: { raBillId: billId } }), 0, 'client bills raise no vendor bill');
    await receipts.record(billId, org.organizationId, org.owner.id, { amount: 2_000, receivedDate: today });

    await assert.rejects(workflow.reopen(billId, org.organizationId, org.owner.id, reason), /Void its receipt first/);
    const receipt = await prisma.raBillReceipt.findFirstOrThrow({ where: { billId } });
    await receipts.void(billId, receipt.id, org.organizationId, org.owner.id, { note: 'Bounced cheque' });
    assert.equal((await workflow.reopen(billId, org.organizationId, org.owner.id, reason)).status, 'CHANGES_REQUESTED');
  });

  it('only reopens the latest bill on a contract', async () => {
    const contractId = await contractFor('CLIENT');
    const firstBill = await certifiedBill(contractId);
    const nextBill = await bills.create(contractId, org.organizationId, org.manager.id, { periodFrom: today, periodTo: today });

    await assert.rejects(workflow.reopen(firstBill, org.organizationId, org.owner.id, reason), /RA-02 builds on this bill/);
    await workflow.cancel(nextBill.id, org.organizationId, org.manager.id, {}, false);
    assert.equal((await workflow.reopen(firstBill, org.organizationId, org.owner.id, reason)).status, 'CHANGES_REQUESTED');
  });

  it('refuses once retention held on the bill has been released', async () => {
    const contractId = await contractFor('CLIENT');
    const billId = await certifiedBill(contractId);
    await retention.release(contractId, org.organizationId, org.owner.id, { amount: 500, releasedOn: today });

    await assert.rejects(workflow.reopen(billId, org.organizationId, org.owner.id, reason), /Retention held on this bill has already been released/);
  });

  it('refuses bills that are not certified', async () => {
    const contractId = await contractFor('CLIENT');
    const draft = await bills.create(contractId, org.organizationId, org.manager.id, { periodFrom: today, periodTo: today });
    await assert.rejects(workflow.reopen(draft.id, org.organizationId, org.owner.id, reason), /Only certified bills/);
  });
});
