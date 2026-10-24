import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../src/database/prisma.service';
import { CreatePurchaseOrderDto } from '../../src/modules/procurement/dto/purchase-order.dto';
import { addUtcDays } from '../../src/modules/procurement/procurement-math';
import { PurchaseOrderHistoryService } from '../../src/modules/procurement/purchase-order-history.service';
import { PurchaseOrderWorkflowService } from '../../src/modules/procurement/purchase-order-workflow.service';
import { PurchaseOrdersService } from '../../src/modules/procurement/purchase-orders.service';
import { VendorsService } from '../../src/modules/procurement/vendors.service';
import { connectTestDatabase } from './support/test-database';
import { OrganizationFixture, archiveProject, createOrganization, createProject, createVendor, settleTogether } from './support/fixtures';

describe('purchase order approvals', () => {
  let prisma: PrismaService;
  let orders: PurchaseOrdersService;
  let workflow: PurchaseOrderWorkflowService;
  let org: OrganizationFixture;
  let otherOrg: OrganizationFixture;
  let vendorId: string;

  before(async () => {
    prisma = await connectTestDatabase();
    const vendors = new VendorsService(prisma);
    const history = new PurchaseOrderHistoryService();
    orders = new PurchaseOrdersService(prisma, vendors, history);
    workflow = new PurchaseOrderWorkflowService(prisma, orders, vendors, history);
    org = await createOrganization(prisma, 'Purchase Orders');
    otherOrg = await createOrganization(prisma, 'Purchase Orders Other');
    vendorId = await createVendor(prisma, org.organizationId, 'Shree Cements');
  });
  after(() => prisma.$disconnect());

  const nextWeek = addUtcDays(new Date(), 7).toISOString().slice(0, 10);
  const orderFor = (projectId = org.projectId, vendor = vendorId): CreatePurchaseOrderDto => ({
    projectId,
    vendorId: vendor,
    category: 'Cement',
    expectedDelivery: nextWeek,
    items: [
      { description: 'OPC 53 grade', unit: 'bag', quantity: 100, rate: 400, taxPercent: 18, discountPercent: 5 },
      { description: 'Unloading', unit: 'lot', quantity: 1, rate: 1500 },
    ],
  });
  /** Raised by the site engineer and submitted for approval. */
  const pending = async () => {
    const draft = await orders.create(org.organizationId, org.engineer.id, orderFor());
    return workflow.submit(draft.id, org.organizationId, org.engineer.id);
  };

  it('prices a draft with discount before GST and checks the project and vendor', async () => {
    const draft = await orders.create(org.organizationId, org.engineer.id, orderFor());
    assert.equal(draft.status, 'DRAFT');
    assert.equal(draft.amount, 46_340); // 100 × 400 less 5% = 38,000, plus 18% GST = 44,840, plus 1,500
    assert.match(draft.poNumber, /^PO-/);

    const inactive = await createVendor(prisma, org.organizationId, 'Closed Traders');
    await prisma.vendor.update({ where: { id: inactive }, data: { status: 'INACTIVE' } });
    await assert.rejects(orders.create(org.organizationId, org.engineer.id, orderFor(org.projectId, inactive)), BadRequestException);
    const foreignVendor = await createVendor(prisma, otherOrg.organizationId, 'Elsewhere Supplies');
    await assert.rejects(orders.create(org.organizationId, org.engineer.id, orderFor(org.projectId, foreignVendor)), NotFoundException);
  });

  it('never lets whoever raised an order approve, reject or send it back', async () => {
    const order = await pending();
    assert.equal(order.status, 'PENDING');
    await assert.rejects(workflow.approve(order.id, org.organizationId, org.engineer.id, {}), ForbiddenException);
    await assert.rejects(workflow.reject(order.id, org.organizationId, org.engineer.id, { note: 'Self' }), ForbiddenException);
    await assert.rejects(workflow.requestChanges(order.id, org.organizationId, org.engineer.id, { note: 'Self' }), ForbiddenException);
  });

  it('approves once, records the reviewer, and keeps the order history in order', async () => {
    const order = await pending();
    const approved = await workflow.approve(order.id, org.organizationId, org.manager.id, { note: 'Within budget' });
    assert.equal(approved.status, 'APPROVED');
    assert.equal(approved.reviewedBy?.id, org.manager.id);
    assert.equal(approved.reviewNote, 'Within budget');
    await assert.rejects(workflow.approve(order.id, org.organizationId, org.owner.id, {}), ConflictException);
    assert.deepEqual(approved.timeline.map((event) => event.stage), ['Created', 'Submitted', 'Approved']);
  });

  it('locks a submitted order, and takes it back after changes are requested', async () => {
    const order = await pending();
    await assert.rejects(orders.update(order.id, org.organizationId, { notes: 'Too late' }), ConflictException);

    const sentBack = await workflow.requestChanges(order.id, org.organizationId, org.manager.id, { note: 'Split the unloading charge' });
    assert.equal(sentBack.status, 'CHANGES_REQUESTED');
    const edited = await orders.update(order.id, org.organizationId, { items: [{ description: 'OPC 53 grade', unit: 'bag', quantity: 80, rate: 400 }] });
    assert.equal(edited.amount, 32_000);

    const resubmitted = await workflow.submit(order.id, org.organizationId, org.engineer.id);
    assert.equal(resubmitted.status, 'PENDING');
    assert.equal(resubmitted.reviewNote, null);
    assert.equal(resubmitted.reviewedBy, null);
  });

  it('lets only one of two approvers acting at the same moment win', async () => {
    for (let attempt = 0; attempt < 15; attempt++) {
      const order = await pending();
      const { fulfilled, rejected } = await settleTogether([
        () => workflow.approve(order.id, org.organizationId, org.manager.id, {}),
        () => workflow.reject(order.id, org.organizationId, org.owner.id, { note: 'Over budget' }),
      ]);
      assert.equal(fulfilled.length, 1, `exactly one review should succeed (attempt ${attempt + 1})`);
      assert.ok(rejected[0] instanceof ConflictException);
      const steps = await prisma.poApprovalStep.count({ where: { purchaseOrderId: order.id } });
      assert.equal(steps, 3, 'created, submitted and one review');
    }
  });

  it('lets the requester withdraw an open order, but only approvers cancel approved ones', async () => {
    const own = await pending();
    await assert.rejects(workflow.cancel(own.id, org.organizationId, org.owner.id, {}, false), ForbiddenException);
    const withdrawn = await workflow.cancel(own.id, org.organizationId, org.engineer.id, { note: 'Ordered twice' }, false);
    assert.equal(withdrawn.status, 'CANCELLED');
    await assert.rejects(workflow.cancel(own.id, org.organizationId, org.engineer.id, {}, false), ConflictException);

    const committed = await pending();
    await workflow.approve(committed.id, org.organizationId, org.manager.id, {});
    await assert.rejects(workflow.cancel(committed.id, org.organizationId, org.engineer.id, {}, false), ForbiddenException);
    const delivery = await prisma.delivery.create({
      data: { purchaseOrderId: committed.id, organizationId: org.organizationId, scheduledDate: new Date(), status: 'SCHEDULED' },
    });
    const cancelled = await workflow.cancel(committed.id, org.organizationId, org.manager.id, {}, true);
    assert.equal(cancelled.status, 'CANCELLED');
    assert.equal((await prisma.delivery.findUniqueOrThrow({ where: { id: delivery.id } })).status, 'CANCELLED', 'the shipment is called off with the order');
  });

  it('refuses to cancel an order once goods have arrived', async () => {
    const order = await pending();
    await workflow.approve(order.id, org.organizationId, org.manager.id, {});
    await prisma.poLineItem.updateMany({ where: { purchaseOrderId: order.id }, data: { receivedQuantity: 10 } });
    await assert.rejects(workflow.cancel(order.id, org.organizationId, org.manager.id, {}, true), ConflictException);
  });

  it('blocks new commitments on archived projects while still allowing a rejection', async () => {
    const projectId = await createProject(prisma, org.organizationId, org.owner.id, 'Old Terminal');
    const first = await orders.create(org.organizationId, org.engineer.id, orderFor(projectId));
    const second = await orders.create(org.organizationId, org.engineer.id, orderFor(projectId));
    await workflow.submit(first.id, org.organizationId, org.engineer.id);
    await workflow.submit(second.id, org.organizationId, org.engineer.id);
    await archiveProject(prisma, projectId);

    await assert.rejects(orders.create(org.organizationId, org.engineer.id, orderFor(projectId)), ConflictException);
    await assert.rejects(workflow.approve(first.id, org.organizationId, org.manager.id, {}), ConflictException);
    const rejected = await workflow.reject(second.id, org.organizationId, org.manager.id, { note: 'Project closed' });
    assert.equal(rejected.status, 'REJECTED');
  });

  it('keeps other organizations out', async () => {
    const order = await pending();
    await assert.rejects(orders.findOne(order.id, otherOrg.organizationId), NotFoundException);
    await assert.rejects(workflow.approve(order.id, otherOrg.organizationId, otherOrg.manager.id, {}), NotFoundException);
    await assert.rejects(orders.create(otherOrg.organizationId, otherOrg.engineer.id, orderFor()), NotFoundException);
  });
});
