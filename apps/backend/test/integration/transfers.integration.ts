import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../src/database/prisma.service';
import { InventoryTransferWorkflowService } from '../../src/modules/inventory/inventory-transfer-workflow.service';
import { InventoryTransfersService } from '../../src/modules/inventory/inventory-transfers.service';
import { StockLedgerService } from '../../src/modules/inventory/stock-ledger.service';
import { connectTestDatabase } from './support/test-database';
import { OrganizationFixture, createMaterial, createOrganization, createStoreWithStock, settleTogether, stockAt } from './support/fixtures';

describe('stock transfers', () => {
  let prisma: PrismaService;
  let transfers: InventoryTransfersService;
  let workflow: InventoryTransferWorkflowService;
  let org: OrganizationFixture;
  let otherOrg: OrganizationFixture;

  before(async () => {
    prisma = await connectTestDatabase();
    transfers = new InventoryTransfersService(prisma);
    workflow = new InventoryTransferWorkflowService(prisma, transfers, new StockLedgerService());
    org = await createOrganization(prisma, 'Transfers');
    otherOrg = await createOrganization(prisma, 'Transfers Other');
  });
  after(() => prisma.$disconnect());

  /** A cement store with 100 bags (10 reserved) and an empty site store. */
  const setUp = async () => {
    const cement = await createMaterial(prisma, org.organizationId, 'Cement OPC 53');
    const central = await createStoreWithStock(prisma, org.organizationId, 'Central Yard', [{ materialId: cement, quantity: 100, reserved: 10 }]);
    const site = await createStoreWithStock(prisma, org.organizationId, 'Site Store');
    return { cement, central, site };
  };

  const request = (from: string, to: string, materialId: string, quantity: number, requesterId = org.owner.id) =>
    transfers.create(org.organizationId, requesterId, { fromWarehouseId: from, toWarehouseId: to, items: [{ materialId, quantity }] });

  it('raises a pending request without moving stock, refusing what the origin store can’t fill', async () => {
    const { cement, central, site } = await setUp();
    await assert.rejects(request(central, central, cement, 5), BadRequestException);
    await assert.rejects(request(central, site, cement, 91), BadRequestException, 'reserved stock is not available');
    await assert.rejects(
      transfers.create(org.organizationId, org.owner.id, { fromWarehouseId: central, toWarehouseId: site, items: [{ materialId: cement, quantity: 1 }, { materialId: cement, quantity: 2 }] }),
      BadRequestException,
    );

    const transfer = await request(central, site, cement, 90);
    assert.equal(transfer.status, 'PENDING');
    assert.match(transfer.code, /^TRF-/);
    assert.equal(await stockAt(prisma, central, cement), 100);
  });

  it('keeps the requester from approving or rejecting their own request', async () => {
    const { cement, central, site } = await setUp();
    const transfer = await request(central, site, cement, 20);
    await assert.rejects(workflow.approve(transfer.id, org.organizationId, org.owner.id), ForbiddenException);
    await assert.rejects(workflow.reject(transfer.id, org.organizationId, org.owner.id, 'No'), ForbiddenException);
  });

  it('moves stock only when the receiving store confirms, once', async () => {
    const { cement, central, site } = await setUp();
    const transfer = await request(central, site, cement, 30);
    await assert.rejects(workflow.complete(transfer.id, org.organizationId, org.engineer.id), BadRequestException);

    const approved = await workflow.approve(transfer.id, org.organizationId, org.manager.id);
    assert.equal(approved.status, 'APPROVED');
    assert.equal(approved.approvedBy?.id, org.manager.id);
    assert.equal(await stockAt(prisma, central, cement), 100, 'approval alone moves nothing');

    const completed = await workflow.complete(transfer.id, org.organizationId, org.engineer.id);
    assert.equal(completed.status, 'COMPLETED');
    assert.equal(await stockAt(prisma, central, cement), 70);
    assert.equal(await stockAt(prisma, site, cement), 30);
    assert.deepEqual(completed.transactions.map((entry) => entry.type).sort(), ['TRANSFER_IN', 'TRANSFER_OUT']);

    await assert.rejects(workflow.complete(transfer.id, org.organizationId, org.engineer.id), ConflictException);
    assert.equal(await stockAt(prisma, site, cement), 30);
  });

  it('moves stock once when “received” is clicked twice at the same moment', async () => {
    const { cement, central, site } = await setUp();
    const transfer = await request(central, site, cement, 25);
    await workflow.approve(transfer.id, org.organizationId, org.manager.id);

    const { fulfilled, rejected } = await settleTogether([
      () => workflow.complete(transfer.id, org.organizationId, org.engineer.id),
      () => workflow.complete(transfer.id, org.organizationId, org.manager.id),
    ]);
    assert.equal(fulfilled.length, 1);
    assert.ok(rejected[0] instanceof ConflictException);
    assert.equal(await stockAt(prisma, central, cement), 75);
    assert.equal(await stockAt(prisma, site, cement), 25);
  });

  it('never spends the same stock twice when two approved transfers are received together', async () => {
    const { cement, central, site } = await setUp();
    const otherSite = await createStoreWithStock(prisma, org.organizationId, 'Second Site');
    const first = await request(central, site, cement, 60);
    const second = await request(central, otherSite, cement, 60);
    await workflow.approve(first.id, org.organizationId, org.manager.id);
    await workflow.approve(second.id, org.organizationId, org.manager.id);

    const { fulfilled, rejected } = await settleTogether([
      () => workflow.complete(first.id, org.organizationId, org.engineer.id),
      () => workflow.complete(second.id, org.organizationId, org.engineer.id),
    ]);
    assert.equal(fulfilled.length, 1, 'only 90 bags are available, so only one 60-bag transfer can arrive');
    assert.ok(rejected[0] instanceof BadRequestException);
    assert.equal(await stockAt(prisma, central, cement), 40);
    assert.equal(await stockAt(prisma, site, cement) + await stockAt(prisma, otherSite, cement), 60);

    const loser = first.id === fulfilled[0].id ? second.id : first.id;
    const stillOpen = await prisma.stockTransfer.findUniqueOrThrow({ where: { id: loser } });
    assert.equal(stillOpen.status, 'APPROVED', 'the failed receipt is rolled back, so it can be received once stock arrives');
  });

  it('refuses to receive when the origin no longer has the stock, leaving the transfer open', async () => {
    const { cement, central, site } = await setUp();
    const transfer = await request(central, site, cement, 50);
    await workflow.approve(transfer.id, org.organizationId, org.manager.id);
    await prisma.inventoryItem.update({ where: { materialId_warehouseId: { materialId: cement, warehouseId: central } }, data: { quantity: 40 } });

    await assert.rejects(workflow.complete(transfer.id, org.organizationId, org.engineer.id), BadRequestException);
    assert.equal(await stockAt(prisma, central, cement), 40);
    assert.equal(await stockAt(prisma, site, cement), 0);
    assert.equal((await prisma.stockTransfer.findUniqueOrThrow({ where: { id: transfer.id } })).status, 'APPROVED');
  });

  it('needs a note to reject, lets only the requester cancel, and closes the transfer for good', async () => {
    const { cement, central, site } = await setUp();
    const rejectedTransfer = await request(central, site, cement, 10);
    const sentBack = await workflow.reject(rejectedTransfer.id, org.organizationId, org.manager.id, '  Use the site stock first  ');
    assert.equal(sentBack.status, 'REJECTED');
    assert.equal(sentBack.reviewNote, 'Use the site stock first');
    await assert.rejects(workflow.approve(rejectedTransfer.id, org.organizationId, org.manager.id), ConflictException);

    const withdrawn = await request(central, site, cement, 10);
    await assert.rejects(workflow.cancel(withdrawn.id, org.organizationId, org.manager.id), ForbiddenException);
    const cancelled = await workflow.cancel(withdrawn.id, org.organizationId, org.owner.id, 'Raised by mistake');
    assert.equal(cancelled.status, 'CANCELLED');
    await assert.rejects(workflow.complete(withdrawn.id, org.organizationId, org.engineer.id), ConflictException);
  });

  it('keeps other organizations out of stores and transfers', async () => {
    const { cement, central, site } = await setUp();
    const foreignStore = await createStoreWithStock(prisma, otherOrg.organizationId, 'Foreign Yard');
    await assert.rejects(request(central, foreignStore, cement, 5), NotFoundException);

    const transfer = await request(central, site, cement, 5);
    await assert.rejects(transfers.findOne(transfer.id, otherOrg.organizationId), NotFoundException);
    await assert.rejects(workflow.approve(transfer.id, otherOrg.organizationId, otherOrg.manager.id), NotFoundException);
  });
});
