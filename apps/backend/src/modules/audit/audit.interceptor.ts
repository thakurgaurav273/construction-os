import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { AUDIT_KEY, AuditMetadata } from '../../common/audit';
import { AuditService } from './audit.service';
import { sanitizeForAudit } from './audit-metadata';

interface RequestActor {
  id: string;
  name: string;
  organizationId: string;
}

/** Sign-in style responses identify the actor in the body because there is no signed-in user yet. */
interface SessionResult {
  user?: { id?: unknown; name?: unknown };
  organization?: { id?: unknown } | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Handlers may already return the `{ success, message, data }` envelope; audit the payload inside it. */
function unwrapEnvelope(response: unknown): unknown {
  const record = asRecord(response);
  return record && 'success' in record && 'data' in record ? record.data : response;
}

function resolveActor(request: Request & { user?: RequestActor }, result: unknown): RequestActor | null {
  if (request.user) return request.user;
  const session = asRecord(result) as SessionResult | null;
  const id = stringField(session?.user?.id);
  const name = stringField(session?.user?.name);
  const organizationId = stringField(session?.organization?.id);
  return id && name && organizationId ? { id, name, organizationId } : null;
}

/**
 * Writes the audit entry for endpoints marked with `@Audit(...)` once they succeed. Failed or rejected
 * requests change nothing, so they aren't recorded.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.get<AuditMetadata | undefined>(AUDIT_KEY, context.getHandler());
    if (!metadata || context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<Request & { user?: RequestActor }>();
    return next.handle().pipe(
      tap((response) => {
        const result = unwrapEnvelope(response);
        const actor = resolveActor(request, result);
        if (!actor) return;
        const body = asRecord(result);
        void this.audit.record({
          action: metadata.action,
          organizationId: actor.organizationId,
          actorId: actor.id,
          actorName: actor.name,
          entityId: stringField(request.params[metadata.idParam ?? 'id']) ?? stringField(body?.id),
          projectId: stringField(request.params.projectId) ?? stringField(body?.projectId),
          metadata: sanitizeForAudit({ params: request.params, input: request.body }),
          ipAddress: request.ip ?? null,
          userAgent: request.get('user-agent') ?? null,
        });
      }),
    );
  }
}
