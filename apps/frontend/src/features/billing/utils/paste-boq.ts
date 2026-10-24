import type { BoqItemFormValues } from '../validation/boq.schema';

const toNumber = (value: string | undefined): number => Number((value ?? '').replace(/,/g, '').trim()) || 0;

/**
 * Reads rows copied from a spreadsheet (tab-separated) in the column order
 * Item no · Code · Description · Unit · Quantity · Rate. Rows without a description are skipped,
 * so a copied heading or total row does no harm.
 */
export function parsePastedBoq(text: string): BoqItemFormValues[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split('\t').map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 4 && cells[2] && !/^description/i.test(cells[2]))
    .map(([itemNo, rateCode, description, unit, quantity, rate]) => ({
      itemNo: itemNo ?? '',
      rateCode: rateCode ?? '',
      description: description ?? '',
      unit: unit || 'Nos',
      quantity: toNumber(quantity),
      rate: toNumber(rate),
      isExtra: /^ns/i.test(rateCode ?? ''),
    }));
}
