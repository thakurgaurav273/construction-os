/** Trims user text. `undefined` means "not provided"; blank text becomes `null` so the field is cleared. */
export function normalizeOptionalText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}
