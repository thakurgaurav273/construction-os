import { SetMetadata } from '@nestjs/common';
import type { AuditAction } from './audit-actions';

export const AUDIT_KEY = 'auditAction';

export interface AuditMetadata {
  action: AuditAction;
  /** Route param holding the affected record's id. Defaults to `id`; otherwise the response's `id` is used. */
  idParam?: string;
}

/**
 * Records a successful call in the audit log: who, what, which record, when, from where. Every write
 * endpoint carries one (a test enforces it), except a short list of personal or session housekeeping routes.
 */
export const Audit = (action: AuditAction, options: { idParam?: string } = {}): MethodDecorator =>
  SetMetadata(AUDIT_KEY, { action, idParam: options.idParam } satisfies AuditMetadata);
