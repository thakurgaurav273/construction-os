/** Same formula as the backend (procurement-math.ts) so form previews match the saved amount. */

interface PricedLine {
  quantity: number;
  rate: number;
  taxPercent: number;
  discountPercent: number;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function lineItemGross(line: PricedLine): number {
  return roundMoney(line.quantity * line.rate);
}

export function lineItemDiscount(line: PricedLine): number {
  return roundMoney(lineItemGross(line) * (line.discountPercent / 100));
}

/** Discount applies to the gross amount; GST is charged on the discounted value. */
export function lineItemTotal(line: PricedLine): number {
  const discounted = line.quantity * line.rate * (1 - line.discountPercent / 100);
  return roundMoney(discounted * (1 + line.taxPercent / 100));
}

export interface OrderBreakdown {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

export function orderBreakdown(lines: PricedLine[]): OrderBreakdown {
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + lineItemGross(line), 0));
  const discount = roundMoney(lines.reduce((sum, line) => sum + lineItemDiscount(line), 0));
  const total = roundMoney(lines.reduce((sum, line) => sum + lineItemTotal(line), 0));
  return { subtotal, discount, tax: roundMoney(total - (subtotal - discount)), total };
}
