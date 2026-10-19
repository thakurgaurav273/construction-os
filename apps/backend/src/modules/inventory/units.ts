/**
 * Units are free text in both the material catalogue ("Bags", "Cu.m") and on purchase orders ("bag", "cum").
 * These groups treat common spellings of the same unit as equal. Different units (MT vs kg) never match:
 * posting 2 MT as 2 kg would silently corrupt stock, so the caller must pick a material stocked in the PO's unit.
 */
const UNIT_GROUPS: string[][] = [
  ['nos', 'no', 'number', 'numbers', 'pcs', 'pc', 'piece', 'pieces', 'unit', 'units', 'ea', 'each'],
  ['bag', 'bags'],
  ['cum', 'cu.m', 'cu m', 'm3', 'cubic metre', 'cubic meter', 'cbm'],
  ['cft', 'cu.ft', 'cu ft', 'ft3', 'cubic feet'],
  ['sqm', 'sq.m', 'sq m', 'm2', 'square metre', 'square meter'],
  ['sqft', 'sq.ft', 'sq ft', 'ft2', 'square feet'],
  ['mt', 'tonne', 'tonnes', 'ton', 'tons', 'metric ton'],
  ['kg', 'kgs', 'kilogram', 'kilograms'],
  ['ltr', 'litre', 'litres', 'liter', 'liters', 'l'],
  ['mtr', 'm', 'rmt', 'metre', 'metres', 'meter', 'meters', 'running metre'],
  ['sheet', 'sheets'],
  ['box', 'boxes'],
  ['coil', 'coils'],
  ['set', 'sets'],
];

const CANONICAL = new Map(UNIT_GROUPS.flatMap((group) => group.map((alias) => [alias, group[0]] as const)));

export function canonicalUnit(unit: string): string {
  const normalized = unit.trim().toLowerCase().replace(/\s+/g, ' ');
  return CANONICAL.get(normalized) ?? normalized;
}

export function sameUnit(a: string, b: string): boolean {
  return canonicalUnit(a) === canonicalUnit(b);
}
