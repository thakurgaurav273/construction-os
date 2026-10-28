/** Field names whose values must never be stored: credentials, tokens, provider API keys and cloud access keys. */
const SENSITIVE_KEY = /password|token|secret|otp|api[-_]?key|access[-_]?key|private[-_]?key|authorization|credential/i;
const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_ITEMS = 50;
const MAX_DEPTH = 4;
const REDACTED = '[redacted]';

export type AuditValue = string | number | boolean | null | AuditValue[] | { [key: string]: AuditValue };

/**
 * Turns request input into something safe and small enough to keep forever: credentials are redacted,
 * long text is cut, and deep or huge structures are summarised.
 */
export function sanitizeForAudit(value: unknown, depth = 0): AuditValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (depth >= MAX_DEPTH) return '[nested]';
  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeForAudit(item, depth + 1));
    return value.length > MAX_ARRAY_ITEMS ? [...items, `…${value.length - MAX_ARRAY_ITEMS} more`] : items;
  }
  if (typeof value === 'object') {
    if (Buffer.isBuffer(value)) return '[binary]';
    const result: { [key: string]: AuditValue } = {};
    for (const [key, entry] of Object.entries(value)) {
      result[key] = SENSITIVE_KEY.test(key) ? REDACTED : sanitizeForAudit(entry, depth + 1);
    }
    return result;
  }
  return null;
}
