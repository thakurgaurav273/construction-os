import { HttpException, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ValidationError, validate } from 'class-validator';
import { parseDate, parseList, parseNumber, parseOption, parseText } from '../cell-parsers';
import { ImportEntityDefinition } from '../import-definitions';
import { MappedRow } from '../import-mapping';

export type RowAction = 'create' | 'update' | 'skip' | 'error';
export type ExistingRecordPolicy = 'skip' | 'update';

export interface RowOutcome {
  rowNumber: number;
  /** What the row is, e.g. the material name, so people can find it in their sheet. */
  label: string;
  action: RowAction;
  messages: string[];
}

export interface ImportRunContext {
  organizationId: string;
  userId: string;
  onExisting: ExistingRecordPolicy;
}

export interface ExportRecord {
  values: Record<string, string | number | null>;
  extras?: Record<string, string>;
}

/**
 * One per importable entity. Importers never write to tables themselves: they resolve references and then
 * call the same services the screens use, so an imported record obeys the same rules as one typed in.
 */
export interface EntityImporter {
  readonly definition: ImportEntityDefinition;
  /** Validates every row and says what would happen, without writing anything. */
  preview(context: ImportRunContext, rows: MappedRow[]): Promise<RowOutcome[]>;
  /** Writes the rows a preview accepts. Rows stand alone: one failing row doesn't undo the others. */
  commit(context: ImportRunContext, rows: MappedRow[]): Promise<RowOutcome[]>;
  /** Current records keyed by field, for exporting in the organization's own layout. */
  exportRecords(organizationId: string): Promise<ExportRecord[]>;
}

export interface PlannedRow<Payload> {
  outcome: RowOutcome;
  /** Present when the row will be created or updated. */
  payload?: Payload;
}

const logger = new Logger('DataImport');

/** Runs the writes one row at a time, turning a failure into that row's error instead of stopping the import. */
export async function writePlannedRows<Payload>(
  planned: PlannedRow<Payload>[],
  write: (payload: Payload, outcome: RowOutcome) => Promise<void>,
): Promise<RowOutcome[]> {
  const outcomes: RowOutcome[] = [];
  for (const { outcome, payload } of planned) {
    if (!payload || (outcome.action !== 'create' && outcome.action !== 'update')) {
      outcomes.push(outcome);
      continue;
    }
    try {
      await write(payload, outcome);
      outcomes.push(outcome);
    } catch (error) {
      if (!(error instanceof HttpException)) logger.error('Import row failed', error instanceof Error ? error.stack : undefined);
      outcomes.push({ ...outcome, action: 'error', messages: [failureMessage(error)] });
    }
  }
  return outcomes;
}

function failureMessage(error: unknown): string {
  if (!(error instanceof HttpException)) return 'This row couldn’t be saved. Try again, or add it by hand.';
  const response = error.getResponse();
  if (typeof response === 'string') return response;
  if ('message' in response) {
    const message = response.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join('. ');
  }
  return error.message;
}

export interface ParsedRow {
  rowNumber: number;
  errors: string[];
  extras: Record<string, string>;
  text(key: string): string | undefined;
  number(key: string): number | undefined;
  list(key: string): string[] | undefined;
}

/** Reads every field with its type's parser and lists what's missing or unreadable, by field label. */
export function parseRow(definition: ImportEntityDefinition, row: MappedRow): ParsedRow {
  const texts = new Map<string, string>();
  const numbers = new Map<string, number>();
  const lists = new Map<string, string[]>();
  const errors: string[] = [];

  for (const field of definition.fields) {
    const raw = row.values[field.key] ?? '';
    if (raw === '') {
      if (field.required) errors.push(`${field.label} is missing.`);
      continue;
    }
    if (field.type === 'number') {
      const value = parseNumber(raw);
      if (value === null) errors.push(`${field.label} "${raw}" isn’t a number.`);
      else if (value !== undefined) numbers.set(field.key, value);
    } else if (field.type === 'date') {
      const value = parseDate(raw);
      if (value === null) errors.push(`${field.label} "${raw}" isn’t a date we recognise. Use DD/MM/YYYY.`);
      else if (value !== undefined) texts.set(field.key, value);
    } else if (field.type === 'option') {
      const value = parseOption(raw, field.options ?? []);
      if (value === null) errors.push(`${field.label} "${raw}" should be one of ${(field.options ?? []).join(', ')}.`);
      else if (value !== undefined) texts.set(field.key, value);
    } else if (field.type === 'list') {
      const value = parseList(raw);
      if (value) lists.set(field.key, value);
    } else {
      const value = parseText(raw);
      if (value !== undefined) texts.set(field.key, value);
    }
  }

  return {
    rowNumber: row.rowNumber,
    errors,
    extras: row.extras,
    text: (key) => texts.get(key),
    number: (key) => numbers.get(key),
    list: (key) => lists.get(key),
  };
}

function flattenErrors(errors: ValidationError[], labels: Record<string, string>, prefix = ''): string[] {
  return errors.flatMap((error) => {
    const label = labels[error.property] ?? error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => {
      const readable = message.startsWith(error.property) ? `${label}${message.slice(error.property.length)}` : message;
      return `${prefix}${readable.charAt(0).toUpperCase()}${readable.slice(1)}.`;
    });
    // Nested lines (purchase order items) are reported as "Item 2: ...".
    const childPrefix = /^\d+$/.test(error.property) ? `Item ${Number(error.property) + 1}: ` : prefix;
    return [...own, ...flattenErrors(error.children ?? [], labels, childPrefix)];
  });
}

/** Runs the endpoint's own DTO rules on a row, so imports and forms can never disagree on what is valid. */
export async function validateAgainstDto<Dto extends object>(
  dtoClass: new () => Dto,
  plain: object,
  definition: ImportEntityDefinition,
  /** Labels for DTO properties named differently from the import fields. */
  extraLabels: Record<string, string> = {},
): Promise<{ dto: Dto; errors: string[] }> {
  const dto = plainToInstance(dtoClass, plain);
  const labels = { ...Object.fromEntries(definition.fields.map((field) => [field.key, field.label])), ...extraLabels };
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: false });
  return { dto, errors: flattenErrors(errors, labels) };
}

export function rowLabel(...candidates: (string | undefined)[]): string {
  return candidates.find((candidate) => candidate !== undefined && candidate !== '') ?? 'Unnamed row';
}

export function lowerKey(value: string): string {
  return value.trim().toLowerCase();
}
