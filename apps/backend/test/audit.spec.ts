import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AUDIT_KEY, AuditMetadata, isAuditAction } from '../src/common/audit';
import { sanitizeForAudit } from '../src/modules/audit/audit-metadata';
import { ControllerClass, loadControllers, writeRoutes } from './controller-routes';

/** Writes that change nothing worth auditing: session housekeeping and a member's own notification inbox. */
const UNAUDITED_WRITES = new Set([
  'AuthController.refresh',
  'AuthController.logout',
  // No organization or actor yet; the reset itself is recorded by PasswordResetService.
  'AuthController.forgotPassword',
  'AuthController.resetPassword',
  'NotificationsController.registerDevice',
  'NotificationsController.unregisterDevice',
  'NotificationsController.markAllRead',
  'NotificationsController.markRead',
  'NotificationsController.remove',
  'NotificationsController.updatePreferences',
  // AI calls are logged per call in ai_usage instead.
  'AiController.organizationChat',
  'AiController.projectChat',
  'AiController.refreshInsights',
  // Reading an upload and dry-running it write nothing; the mapping AI call is logged in ai_usage.
  'DataImportController.analyze',
  'DataImportController.preview',
  'BillingImportController.analyzeBoq',
  'BillingImportController.previewBoq',
  'BillingImportController.analyzeMeasurements',
  'BillingImportController.previewMeasurements',
  // Platform console: decisions are recorded in the tenant's audit log by the service; platform keys belong to no tenant.
  'PlatformController.approve',
  'PlatformController.reject',
  'PlatformController.saveKey',
  'PlatformController.makeDefault',
  'PlatformController.removeKey',
]);

describe('audit coverage', () => {
  let controllers: ControllerClass[] = [];
  before(async () => {
    controllers = await loadControllers();
  });

  it('records every write endpoint in the audit log', () => {
    const missing = writeRoutes(controllers)
      .filter(({ key, handler }) => !UNAUDITED_WRITES.has(key) && !Reflect.getMetadata(AUDIT_KEY, handler))
      .map(({ key }) => key);
    assert.deepEqual(missing, [], `Add @Audit(...) to: ${missing.join(', ')}`);
  });

  it('only uses actions from the catalogue', () => {
    for (const { key, handler } of writeRoutes(controllers)) {
      const metadata: AuditMetadata | undefined = Reflect.getMetadata(AUDIT_KEY, handler);
      if (metadata) assert.ok(isAuditAction(metadata.action), `${key} uses unknown audit action ${metadata.action}`);
    }
  });
});

describe('audit metadata', () => {
  it('redacts credentials at any depth', () => {
    const clean = sanitizeForAudit({ password: 'hunter22', nested: { refreshToken: 'abc', name: 'Site A' }, list: [{ secretKey: 'x' }] });
    assert.deepEqual(clean, { password: '[redacted]', nested: { refreshToken: '[redacted]', name: 'Site A' }, list: [{ secretKey: '[redacted]' }] });
  });

  it('caps long text and large lists', () => {
    const clean = sanitizeForAudit({ note: 'x'.repeat(2000), items: Array.from({ length: 60 }, (_, index) => index) });
    assert.ok(typeof clean === 'object' && clean !== null && !Array.isArray(clean));
    assert.equal(String(clean.note).length, 501);
    assert.ok(Array.isArray(clean.items) && clean.items.length === 51 && clean.items[50] === '…10 more');
  });
});
