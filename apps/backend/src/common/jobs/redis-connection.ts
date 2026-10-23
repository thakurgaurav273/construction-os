import type { ConnectionOptions } from 'bullmq';

/** BullMQ takes ioredis options, not a URL; this reads redis[s]://user:pass@host:port/db. */
export function redisConnectionFromUrl(url: string): ConnectionOptions {
  const parsed = new URL(url);
  const db = parsed.pathname.replace('/', '');
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: db ? Number(db) : undefined,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
    // Workers block on Redis; BullMQ requires this to be unlimited.
    maxRetriesPerRequest: null,
  };
}
