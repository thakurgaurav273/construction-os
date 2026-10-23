import { addDays, format } from 'date-fns';
import { DEFAULT_PAYMENT_TERM_DAYS } from '../constants';

/** "Net 45" → 45 days. Advance or unstructured terms fall back to the default credit period. */
export function paymentTermDays(paymentTerms: string | null | undefined): number {
  const match = paymentTerms?.match(/net\s*(\d{1,3})/i);
  return match ? Number(match[1]) : DEFAULT_PAYMENT_TERM_DAYS;
}

/** Due date for a bill dated `issuedDate` (yyyy-MM-dd) under the vendor's payment terms. */
export function dueDateFor(issuedDate: string, paymentTerms: string | null | undefined): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issuedDate)) return '';
  return format(addDays(new Date(`${issuedDate}T00:00:00`), paymentTermDays(paymentTerms)), 'yyyy-MM-dd');
}
