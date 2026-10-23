import { Injectable, Logger } from '@nestjs/common';
import type { AuditAction } from '../audit';

/** Something that happened in the business, as recorded in the audit log. */
export interface DomainEvent {
  action: AuditAction;
  organizationId: string;
  actorId: string | null;
  actorName: string;
  entityType: string;
  entityId: string | null;
  projectId: string | null;
  /** The redacted request input, e.g. `{ input: { note: '…' } }`. */
  metadata: unknown;
  occurredAt: Date;
}

export type DomainEventHandler = (event: DomainEvent) => Promise<void>;

/**
 * In-process publish/subscribe for domain events. Publishers never wait for subscribers, and a failing
 * subscriber is logged without affecting the request or the other subscribers. Swap for a queue (T14) when
 * handlers need retries or run in another process.
 */
@Injectable()
export class DomainEventsService {
  private readonly logger = new Logger(DomainEventsService.name);
  private readonly handlers: DomainEventHandler[] = [];

  subscribe(handler: DomainEventHandler): void {
    this.handlers.push(handler);
  }

  publish(event: DomainEvent): void {
    for (const handler of this.handlers) {
      handler(event).catch((error: unknown) => {
        this.logger.error(`Handler failed for ${event.action}`, error instanceof Error ? error.stack : undefined);
      });
    }
  }
}
