import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DomainEvent, DomainEventsService } from '../src/common/events';
import type { PrismaService } from '../src/database/prisma.service';
import { NotificationRecipientsService } from '../src/modules/notifications/notification-recipients.service';
import { NOTIFICATION_CATEGORIES } from '../src/modules/notifications/notification-categories';
import { rolesWithPermission } from '../src/common/permissions';

const event: DomainEvent = {
  action: 'purchase_order.approved',
  organizationId: 'org-1',
  actorId: 'approver',
  actorName: 'Approver',
  entityType: 'purchase_order',
  entityId: 'po-1',
  projectId: null,
  metadata: null,
  occurredAt: new Date(),
};

describe('domain events', () => {
  it('delivers to every subscriber even when one fails', async () => {
    const events = new DomainEventsService();
    const received: string[] = [];
    events.subscribe(async () => { throw new Error('boom'); });
    events.subscribe(async (published) => { received.push(published.action); });
    events.publish(event);
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(received, ['purchase_order.approved']);
  });
});

describe('notification recipients', () => {
  const recipients = new NotificationRecipientsService({} as PrismaService);

  it('never notifies people about their own actions', () => {
    assert.deepEqual(recipients.only('approver', 'approver'), []);
    assert.deepEqual(recipients.only('requester', 'approver'), ['requester']);
    assert.deepEqual(recipients.only(null, 'approver'), []);
  });

  it('finds approvers by permission, not by hardcoded role names', () => {
    assert.deepEqual(rolesWithPermission('po.approve').sort(), ['ADMIN', 'OWNER', 'PROJECT_MANAGER']);
    assert.ok(!rolesWithPermission('payment.release').includes('PROJECT_MANAGER'));
  });

  it('emails approvals by default but not outcomes', () => {
    assert.equal(NOTIFICATION_CATEGORIES.approvals.defaults.email, true);
    assert.equal(NOTIFICATION_CATEGORIES.decisions.defaults.email, false);
  });
});
