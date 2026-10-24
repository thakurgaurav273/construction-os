import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../src/database/prisma.service';
import { StockLedgerService } from '../../src/modules/inventory/stock-ledger.service';
import { MaterialRequestWorkflowService } from '../../src/modules/materials/material-request-workflow.service';
import { MaterialRequestsService } from '../../src/modules/materials/material-requests.service';
import { ProjectMaterialsService } from '../../src/modules/materials/project-materials.service';
import { connectTestDatabase } from './support/test-database';
import {
  OrganizationFixture, archiveProject, createMaterial, createOrganization, createProject, createStoreWithStock, settleTogether, stockAt,
} from './support/fixtures';

describe('material requests', () => {
  let prisma: PrismaService;
  let requests: MaterialRequestsService;
  let workflow: MaterialRequestWorkflowService;
  let org: OrganizationFixture;
  let otherOrg: OrganizationFixture;

  before(async () => {
    prisma = await connectTestDatabase();
    requests = new MaterialRequestsService(prisma);
    workflow = new MaterialRequestWorkflowService(prisma, requests, new ProjectMaterialsService(prisma, new StockLedgerService()));
    org = await createOrganization(prisma, 'Material Requests');
    otherOrg = await createOrganization(prisma, 'Material Requests Other');
  });
  after(() => prisma.$disconnect());

  /** Cement (100 bags) and sand (50 m³) in one store, and a second store with 40 more bags of cement. */
  const setUp = async () => {
    const cement = await createMaterial(prisma, org.organizationId, 'Cement OPC 53');
    const sand = await createMaterial(prisma, org.organizationId, 'River Sand', 1800);
    const central = await createStoreWithStock(prisma, org.organizationId, 'Central Yard', [
      { materialId: cement, quantity: 100 }, { materialId: sand, quantity: 50 },
    ]);
    const second = await createStoreWithStock(prisma, org.organizationId, 'North Yard', [{ materialId: cement, quantity: 40 }]);
    return { cement, sand, central, second };
  };

  /** The site engineer asks for material; the project manager is the store side. */
  const raise = (lines: { materialId: string; quantity: number }[], projectId = org.projectId) =>
    requests.create(org.organizationId, org.engineer.id, { projectId, items: lines, note: 'Slab casting, 3rd floor' });

  const lineFor = (request: Awaited<ReturnType<typeof raise>>, materialId: string): string =>
    request.items.find((item) => item.materialId === materialId)?.id ?? '';

  it('raises a numbered pending request without moving stock', async () => {
    const { cement, sand, central } = await setUp();
    await assert.rejects(raise([{ materialId: cement, quantity: 1 }, { materialId: cement, quantity: 2 }]), BadRequestException);
    await assert.rejects(raise([{ materialId: otherOrg.projectId, quantity: 1 }]), NotFoundException, 'unknown material');
    await assert.rejects(
      requests.create(org.organizationId, org.engineer.id, { projectId: org.projectId, neededBy: '2020-01-01', items: [{ materialId: cement, quantity: 1 }] }),
      BadRequestException,
    );

    const request = await raise([{ materialId: cement, quantity: 30 }, { materialId: sand, quantity: 5 }]);
    assert.equal(request.status, 'PENDING');
    assert.match(request.code, /^MRQ-\d{4}$/);
    assert.equal(request.projectId, org.projectId);
    assert.equal(request.items.length, 2);
    assert.equal(await stockAt(prisma, central, cement), 100);
  });

  it('keeps the requester from approving or rejecting their own request', async () => {
    const { cement } = await setUp();
    const request = await requests.create(org.organizationId, org.manager.id, { projectId: org.projectId, items: [{ materialId: cement, quantity: 5 }] });
    await assert.rejects(workflow.approve(request.id, org.organizationId, org.manager.id), ForbiddenException);
    await assert.rejects(workflow.reject(request.id, org.organizationId, org.manager.id, 'No'), ForbiddenException);
    await assert.rejects(workflow.cancel(request.id, org.organizationId, org.owner.id), ForbiddenException, 'only the requester cancels');
  });

  it('issues only after approval, in parts and from different stores, never beyond what was asked', async () => {
    const { cement, sand, central, second } = await setUp();
    const request = await raise([{ materialId: cement, quantity: 120 }, { materialId: sand, quantity: 5 }]);
    const cementLine = lineFor(request, cement);
    const sandLine = lineFor(request, sand);

    await assert.rejects(
      workflow.issue(request.id, org.organizationId, org.manager.id, { warehouseId: central, lines: [{ itemId: cementLine, quantity: 10 }] }),
      ConflictException,
      'pending requests can’t be issued',
    );
    const approved = await workflow.approve(request.id, org.organizationId, org.manager.id);
    assert.equal(approved.status, 'APPROVED');
    assert.equal(approved.reviewedBy?.id, org.manager.id);

    const first = await workflow.issue(request.id, org.organizationId, org.manager.id, {
      warehouseId: central, lines: [{ itemId: cementLine, quantity: 100 }, { itemId: sandLine, quantity: 5 }],
    });
    assert.equal(first.status, 'PARTLY_ISSUED');
    assert.equal(first.issues.length, 2);
    assert.ok(first.issues.every((issue) => /^MIN-\d{4}$/.test(issue.code)));
    assert.equal(await stockAt(prisma, central, cement), 0);
    assert.deepEqual(first.items.map((item) => [item.issued, item.remaining]).sort(), [[100, 20], [5, 0]].sort());

    await assert.rejects(
      workflow.issue(request.id, org.organizationId, org.manager.id, { warehouseId: second, lines: [{ itemId: cementLine, quantity: 21 }] }),
      BadRequestException,
      'more than is still owed',
    );
    await assert.rejects(
      workflow.issue(request.id, org.organizationId, org.manager.id, { warehouseId: central, lines: [{ itemId: cementLine, quantity: 20 }] }),
      BadRequestException,
      'the store has run out',
    );
    const done = await workflow.issue(request.id, org.organizationId, org.manager.id, { warehouseId: second, lines: [{ itemId: cementLine, quantity: 20 }] });
    assert.equal(done.status, 'ISSUED');
    assert.equal(await stockAt(prisma, second, cement), 20);

    const usage = await prisma.materialProjectUsage.findUniqueOrThrow({ where: { materialId_projectId: { materialId: cement, projectId: org.projectId } } });
    assert.equal(Number(usage.consumed), 120, 'issues against a request count as site consumption');
    await assert.rejects(workflow.close(request.id, org.organizationId, org.manager.id, 'Done'), ConflictException);
  });

  it('issues a line once when two people issue it at the same moment', async () => {
    const { cement, central } = await setUp();
    const request = await raise([{ materialId: cement, quantity: 30 }]);
    await workflow.approve(request.id, org.organizationId, org.manager.id);
    const line = lineFor(request, cement);

    const { fulfilled, rejected } = await settleTogether([org.manager.id, org.owner.id].map((userId) => () =>
      workflow.issue(request.id, org.organizationId, userId, { warehouseId: central, lines: [{ itemId: line, quantity: 30 }] })));
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.ok(rejected[0] instanceof BadRequestException || rejected[0] instanceof ConflictException);
    assert.equal(await stockAt(prisma, central, cement), 70);
  });

  it('rejects with a note, lets the requester cancel before anything is issued, and closes a part-issued request', async () => {
    const { cement, central } = await setUp();
    const rejected = await workflow.reject((await raise([{ materialId: cement, quantity: 5 }])).id, org.organizationId, org.manager.id, '  Use site stock  ');
    assert.equal(rejected.status, 'REJECTED');
    assert.equal(rejected.reviewNote, 'Use site stock');
    await assert.rejects(workflow.approve(rejected.id, org.organizationId, org.manager.id), ConflictException);

    const approved = await raise([{ materialId: cement, quantity: 5 }]);
    await workflow.approve(approved.id, org.organizationId, org.manager.id);
    const cancelled = await workflow.cancel(approved.id, org.organizationId, org.engineer.id, 'Found it on site');
    assert.equal(cancelled.status, 'CANCELLED');
    assert.equal(cancelled.closedBy?.id, org.engineer.id);

    const partial = await raise([{ materialId: cement, quantity: 10 }]);
    await workflow.approve(partial.id, org.organizationId, org.manager.id);
    await workflow.issue(partial.id, org.organizationId, org.manager.id, { warehouseId: central, lines: [{ itemId: lineFor(partial, cement), quantity: 4 }] });
    await assert.rejects(workflow.cancel(partial.id, org.organizationId, org.engineer.id), ConflictException, 'no cancelling once issued');
    const closed = await workflow.close(partial.id, org.organizationId, org.manager.id, 'Rest bought locally');
    assert.equal(closed.status, 'CLOSED');
    assert.equal(closed.items[0].issued, 4);
    assert.equal(await stockAt(prisma, central, cement), 96, 'closing returns nothing and moves nothing');
  });

  it('pauses requests on archived projects but still lets the stores turn them down', async () => {
    const { cement, central } = await setUp();
    const projectId = await createProject(prisma, org.organizationId, org.owner.id, 'Flyover Phase 2');
    const pending = await raise([{ materialId: cement, quantity: 5 }], projectId);
    const approved = await raise([{ materialId: cement, quantity: 5 }], projectId);
    await workflow.approve(approved.id, org.organizationId, org.manager.id);
    await archiveProject(prisma, projectId);

    await assert.rejects(raise([{ materialId: cement, quantity: 1 }], projectId), ConflictException);
    await assert.rejects(workflow.approve(pending.id, org.organizationId, org.manager.id), ConflictException);
    await assert.rejects(
      workflow.issue(approved.id, org.organizationId, org.manager.id, { warehouseId: central, lines: [{ itemId: lineFor(approved, cement), quantity: 5 }] }),
      ConflictException,
    );
    assert.equal((await workflow.reject(pending.id, org.organizationId, org.manager.id, 'Project archived')).status, 'REJECTED');
    assert.equal((await workflow.close(approved.id, org.organizationId, org.manager.id, 'Project archived')).status, 'CLOSED');
  });

  it('keeps requests inside their organization', async () => {
    const { cement } = await setUp();
    const request = await raise([{ materialId: cement, quantity: 5 }]);
    await assert.rejects(requests.findOne(request.id, otherOrg.organizationId), NotFoundException);
    await assert.rejects(workflow.approve(request.id, otherOrg.organizationId, otherOrg.manager.id), NotFoundException);
    await assert.rejects(
      requests.create(otherOrg.organizationId, otherOrg.engineer.id, { projectId: otherOrg.projectId, items: [{ materialId: cement, quantity: 1 }] }),
      NotFoundException,
      'another organization’s material',
    );
    const listed = await requests.findAll(otherOrg.organizationId, { page: 1, limit: 100, status: 'OPEN' });
    assert.ok(!listed.items.some((item) => item.id === request.id));
  });
});
