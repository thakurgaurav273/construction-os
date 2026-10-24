/** Crore figures read naturally for Indian construction budgets, e.g. ₹12.4 Cr. */
export function formatCrore(amount: number | null | undefined): string {
  if (!amount) return '—';
  return `₹${(amount / 10_000_000).toFixed(1)} Cr`;
}

export function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
