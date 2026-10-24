export interface InputDetail {
  label: string;
  value: string;
}

/** Fields that only identify the request, not what changed. */
const HIDDEN_KEYS = new Set(['id', 'organizationId', 'projectId']);
const MAX_DETAILS = 8;
const MAX_VALUE_LENGTH = 80;

/** "reorderLevel" → "Reorder level", "gstNumber" → "Gst number". */
export function humanizeKey(key: string): string {
  const spaced = key.replace(/_/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function describeValue(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString('en-IN');
  if (typeof value === 'string') return value.length > MAX_VALUE_LENGTH ? `${value.slice(0, MAX_VALUE_LENGTH)}…` : value;
  if (Array.isArray(value)) return value.length === 1 ? '1 item' : `${value.length} items`;
  return 'Details';
}

/**
 * The fields sent with an audited request (`metadata.input`), as readable label/value pairs. Empty values and
 * identifiers are skipped; the full redacted input stays available in Settings → Audit Logs.
 */
export function describeAuditInput(metadata: unknown): { details: InputDetail[]; more: number } {
  const input = typeof metadata === 'object' && metadata !== null && 'input' in metadata ? metadata.input : null;
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return { details: [], more: 0 };
  const details = Object.entries(input).flatMap(([key, value]): InputDetail[] => {
    if (HIDDEN_KEYS.has(key)) return [];
    const described = describeValue(value);
    return described === null ? [] : [{ label: humanizeKey(key), value: described }];
  });
  return { details: details.slice(0, MAX_DETAILS), more: Math.max(0, details.length - MAX_DETAILS) };
}
