import { ImportEntityDefinition, ImportField } from './import-definitions';
import { SheetRow, normalizeHeading } from './sheet-reader';

/** A type alias (not an interface) so it is assignable to Prisma's JSON input type without a cast. */
export type ImportMapping = {
  /** Field key → the sheet heading it is read from. */
  columns: Record<string, string>;
  /** Field key → value used when the sheet has no such column or the cell is blank. */
  defaults: Record<string, string>;
  /** Field key → { sheet value → SitePilot value }, e.g. priority { "Urgent": "CRITICAL" }. */
  values: Record<string, Record<string, string>>;
  /** Headings kept on the record as extra details (material specifications). */
  extras: string[];
};

export interface MappedRow {
  rowNumber: number;
  /** Field key → text after defaults and value translations; '' when absent. */
  values: Record<string, string>;
  /** Extra heading → text, only non-blank cells. */
  extras: Record<string, string>;
}

export const EMPTY_MAPPING: ImportMapping = { columns: {}, defaults: {}, values: {}, extras: [] };

const MAX_DEFAULT_LENGTH = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function findHeading(headings: string[], candidate: unknown): string | undefined {
  if (typeof candidate !== 'string') return undefined;
  const wanted = normalizeHeading(candidate);
  return wanted === '' ? undefined : headings.find((heading) => normalizeHeading(heading) === wanted);
}

/**
 * Keeps only what makes sense for this entity and sheet: known fields, headings that exist, option values
 * that are allowed. Used on AI output, on what an admin submits and on stored templates alike.
 */
export function sanitizeMapping(raw: unknown, definition: ImportEntityDefinition, headings: string[]): ImportMapping {
  const source = isRecord(raw) ? raw : {};
  const rawColumns = isRecord(source.columns) ? source.columns : {};
  const rawDefaults = isRecord(source.defaults) ? source.defaults : {};
  const rawValues = isRecord(source.values) ? source.values : {};
  const mapping: ImportMapping = { columns: {}, defaults: {}, values: {}, extras: [] };

  for (const field of definition.fields) {
    const heading = findHeading(headings, rawColumns[field.key]);
    if (heading) mapping.columns[field.key] = heading;

    const fallback = rawDefaults[field.key];
    if (typeof fallback === 'string' && fallback.trim() !== '') {
      mapping.defaults[field.key] = fallback.trim().slice(0, MAX_DEFAULT_LENGTH);
    }

    const translations = rawValues[field.key];
    if (isRecord(translations)) {
      const kept = Object.entries(translations).flatMap(([from, to]): [string, string][] => {
        if (typeof to !== 'string' || from.trim() === '' || to.trim() === '') return [];
        const target = field.options ? field.options.find((option) => option === to.trim().toUpperCase()) : to.trim();
        return target ? [[from.trim(), target]] : [];
      });
      if (kept.length > 0) mapping.values[field.key] = Object.fromEntries(kept);
    }
  }

  if (definition.keepsExtraColumns && Array.isArray(source.extras)) {
    const mapped = new Set(Object.values(mapping.columns));
    mapping.extras = [...new Set(source.extras.map((heading) => findHeading(headings, heading)))]
      .filter((heading): heading is string => heading !== undefined && !mapped.has(heading));
  }
  return mapping;
}

/** Required fields with neither a column nor a fixed value; the template can't be used until these are set. */
export function missingRequiredFields(definition: ImportEntityDefinition, mapping: ImportMapping): ImportField[] {
  return definition.fields.filter((field) => field.required && !mapping.columns[field.key] && !mapping.defaults[field.key]);
}

function translate(mapping: ImportMapping, fieldKey: string, value: string): string {
  const translations = mapping.values[fieldKey];
  if (!translations || value === '') return value;
  const wanted = normalizeHeading(value);
  const match = Object.entries(translations).find(([from]) => normalizeHeading(from) === wanted);
  return match ? match[1] : value;
}

export function applyMapping(
  definition: ImportEntityDefinition,
  mapping: ImportMapping,
  headings: string[],
  row: SheetRow,
): MappedRow {
  const cellFor = (heading: string | undefined): string => {
    if (!heading) return '';
    const index = headings.indexOf(heading);
    return index === -1 ? '' : (row.cells[index] ?? '').trim();
  };

  const values: Record<string, string> = {};
  for (const field of definition.fields) {
    const cell = cellFor(mapping.columns[field.key]);
    values[field.key] = translate(mapping, field.key, cell === '' ? mapping.defaults[field.key] ?? '' : cell);
  }
  const extras = Object.fromEntries(
    mapping.extras.map((heading): [string, string] => [heading, cellFor(heading)]).filter(([, value]) => value !== ''),
  );
  return { rowNumber: row.rowNumber, values, extras };
}

/**
 * Lays a SitePilot record out in the organization's own columns, translating values back to their wording
 * (CRITICAL → "Urgent") so the export looks like the sheet they uploaded.
 */
export function toSheetRow(
  mapping: ImportMapping,
  headings: string[],
  record: Record<string, string | number | null>,
  extras: Record<string, string> = {},
): (string | number | null)[] {
  return headings.map((heading) => {
    const fieldKey = Object.keys(mapping.columns).find((key) => mapping.columns[key] === heading);
    if (!fieldKey) return extras[heading] ?? null;
    const value = record[fieldKey] ?? null;
    if (typeof value !== 'string') return value;
    const original = Object.entries(mapping.values[fieldKey] ?? {}).find(([, to]) => to.toLowerCase() === value.toLowerCase());
    return original ? original[0] : value;
  });
}

function fieldPhrases(field: ImportField): string[] {
  const keyWords = field.key.replace(/([a-z])([A-Z])/g, '$1 $2');
  return [field.label, keyWords, ...field.synonyms].map(normalizeHeading);
}

/** Name-based matching, used when AI isn't available. Exact matches win over partial ones; each heading is used once. */
export function guessMapping(definition: ImportEntityDefinition, headings: string[]): ImportMapping {
  const candidates = definition.fields.flatMap((field) => headings.flatMap((heading) => {
    const normalized = normalizeHeading(heading);
    if (normalized === '') return [];
    const phrases = fieldPhrases(field);
    if (phrases.includes(normalized)) return [{ field: field.key, heading, score: 3 }];
    const partial = phrases.some((phrase) => phrase.length > 2 && (` ${normalized} `.includes(` ${phrase} `)));
    return partial ? [{ field: field.key, heading, score: 1 }] : [];
  }));

  const columns: Record<string, string> = {};
  const usedHeadings = new Set<string>();
  for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
    if (columns[candidate.field] || usedHeadings.has(candidate.heading)) continue;
    columns[candidate.field] = candidate.heading;
    usedHeadings.add(candidate.heading);
  }
  return { ...EMPTY_MAPPING, columns };
}

/** Models sometimes wrap JSON in prose or code fences; take the outermost object and sanitize it. */
export function parseMappingSuggestion(text: string, definition: ImportEntityDefinition, headings: string[]): ImportMapping | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return sanitizeMapping(JSON.parse(text.slice(start, end + 1)), definition, headings);
  } catch {
    return null;
  }
}
