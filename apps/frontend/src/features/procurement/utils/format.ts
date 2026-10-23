/**
 * Compact Indian currency: ₹1.2Cr, ₹18.4L, ₹45k, -₹27.0L.
 *
 * Intl's `en-IN` gives grouped digits (₹18,40,000) but not the lakh/crore
 * shorthand that dashboards use, so this covers the compact case.
 */
export function formatCompactINR(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000) return `${sign}₹${Math.round(abs / 1_000)}k`;
  return `${sign}₹${Math.round(abs)}`;
}
