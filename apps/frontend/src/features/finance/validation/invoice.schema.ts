import { z } from 'zod';
import { format } from 'date-fns';
import { MAX_INVOICE_LINES } from '../constants';
import type { BillableLine, InvoiceDetail, InvoiceInput } from '../types';

/** Radix Select can't hold an empty value, so "no purchase order" uses a sentinel. */
export const NO_PURCHASE_ORDER = 'none';

const isoDay = (message: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message);

export const invoiceLineSchema = z.object({
  poLineItemId: z.string(),
  description: z.string().trim().min(2, 'Describe the item').max(200),
  unit: z.string().trim().min(1, 'Unit').max(20),
  quantity: z.coerce.number({ invalid_type_error: 'Enter a quantity' }).positive('Must be more than 0'),
  rate: z.coerce.number({ invalid_type_error: 'Enter a rate' }).min(0, "Can't be negative"),
  taxPercent: z.coerce.number({ invalid_type_error: 'Enter GST %' }).min(0, "Can't be negative").max(100, 'Max 100%'),
});

export const invoiceSchema = z
  .object({
    invoiceNumber: z.string().trim().min(1, "Enter the vendor's invoice number").max(50),
    vendorId: z.string().min(1, 'Select the vendor'),
    purchaseOrderId: z.string(),
    projectId: z.string(),
    category: z.string().trim().max(60),
    issuedDate: isoDay('Pick the invoice date'),
    dueDate: isoDay('Pick the due date'),
    description: z.string().trim().max(300),
    notes: z.string().trim().max(2000),
    items: z.array(invoiceLineSchema).min(1, 'Add at least one line').max(MAX_INVOICE_LINES),
  })
  .superRefine((values, ctx) => {
    if (values.purchaseOrderId === NO_PURCHASE_ORDER && !values.projectId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['projectId'], message: 'Select the project this bill is charged to' });
    }
    if (values.issuedDate && values.dueDate && values.dueDate < values.issuedDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dueDate'], message: "Can't be before the invoice date" });
    }
  });

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;
export type InvoiceLineFormValues = z.infer<typeof invoiceLineSchema>;

export function emptyInvoiceLine(): InvoiceLineFormValues {
  return { poLineItemId: '', description: '', unit: 'nos', quantity: 1, rate: 0, taxPercent: 18 };
}

/** Prefill from a PO: one line per received-but-unbilled quantity, at the PO's effective rate. */
export function linesFromBillable(lines: BillableLine[]): InvoiceLineFormValues[] {
  return lines
    .filter((line) => line.billableQuantity > 0)
    .map((line) => ({
      poLineItemId: line.poLineItemId,
      description: line.description,
      unit: line.unit,
      quantity: line.billableQuantity,
      rate: line.rate,
      taxPercent: line.taxPercent,
    }));
}

interface InvoiceDefaults {
  vendorId?: string;
  purchaseOrderId?: string;
  projectId?: string;
}

export function toInvoiceFormValues(invoice?: InvoiceDetail, defaults: InvoiceDefaults = {}): InvoiceFormValues {
  const today = format(new Date(), 'yyyy-MM-dd');
  return {
    invoiceNumber: invoice?.invoiceNumber ?? '',
    vendorId: invoice?.vendor?.id ?? defaults.vendorId ?? '',
    purchaseOrderId: invoice?.purchaseOrder?.id ?? defaults.purchaseOrderId ?? NO_PURCHASE_ORDER,
    projectId: invoice?.project?.id ?? defaults.projectId ?? '',
    category: invoice?.category ?? '',
    issuedDate: invoice?.issuedDate.slice(0, 10) ?? today,
    dueDate: invoice?.dueDate.slice(0, 10) ?? '',
    description: invoice?.description ?? '',
    notes: invoice?.notes ?? '',
    items: invoice?.items.length
      ? invoice.items.map((item) => ({
        poLineItemId: item.poLineItemId ?? '',
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        rate: item.rate,
        taxPercent: item.taxPercent,
      }))
      : [emptyInvoiceLine()],
  };
}

export function toInvoiceInput(values: InvoiceFormValues): InvoiceInput {
  const hasPurchaseOrder = values.purchaseOrderId !== NO_PURCHASE_ORDER;
  return {
    invoiceNumber: values.invoiceNumber,
    vendorId: values.vendorId,
    purchaseOrderId: hasPurchaseOrder ? values.purchaseOrderId : undefined,
    // A PO-linked bill takes its project from the PO.
    projectId: hasPurchaseOrder ? undefined : values.projectId,
    category: values.category || undefined,
    issuedDate: values.issuedDate,
    dueDate: values.dueDate,
    description: values.description,
    notes: values.notes,
    items: values.items.map((item) => ({
      poLineItemId: hasPurchaseOrder && item.poLineItemId ? item.poLineItemId : undefined,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      rate: item.rate,
      taxPercent: item.taxPercent,
    })),
  };
}
