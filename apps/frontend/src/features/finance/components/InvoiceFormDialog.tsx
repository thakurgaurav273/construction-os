'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Textarea,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { useProjects } from '@/hooks/api/use-projects';
import { usePurchaseOrders, useVendors } from '@/hooks/api/use-procurement';
import { useBillableLines, useCreateInvoice, useUpdateInvoice } from '@/hooks/api/use-finance';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { InvoiceDetail } from '../types';
import { dueDateFor } from '../utils/payment-terms';
import {
  NO_PURCHASE_ORDER, invoiceSchema, linesFromBillable, toInvoiceFormValues, toInvoiceInput, type InvoiceFormValues,
} from '../validation/invoice.schema';
import { InvoiceLinesEditor } from './InvoiceLinesEditor';

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Omit to record a new bill. */
  invoice?: InvoiceDetail;
  /** Prefills a new bill, e.g. from a purchase order. */
  defaults?: { vendorId?: string; purchaseOrderId?: string; projectId?: string };
  onSaved?: (invoiceId: string) => void;
}

export function InvoiceFormDialog({ open, onOpenChange, invoice, defaults, onSaved }: InvoiceFormDialogProps): React.ReactElement {
  const { data: vendors = [] } = useVendors();
  const { data: projects = [] } = useProjects();
  const { data: approvedOrders = [] } = usePurchaseOrders({ status: 'APPROVED' });
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const isEdit = !!invoice;

  const { register, control, handleSubmit, reset, setValue, getFieldState, formState: { errors, isSubmitting } } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: toInvoiceFormValues(invoice, defaults),
  });
  const [vendorId, purchaseOrderId, issuedDate] = useWatch({ control, name: ['vendorId', 'purchaseOrderId', 'issuedDate'] });
  const hasPurchaseOrder = purchaseOrderId !== NO_PURCHASE_ORDER;
  const { data: billableLines } = useBillableLines(open && hasPurchaseOrder ? purchaseOrderId : null);

  const vendor = vendors.find((option) => option.id === vendorId);
  const vendorOrders = approvedOrders.filter((order) => order.vendor?.id === vendorId);
  const billable = useMemo(() => new Map((billableLines ?? []).map((line) => [line.poLineItemId, line])), [billableLines]);

  const wasOpen = useRef(false);
  const prefilledFor = useRef<string | null>(null);
  useEffect(() => {
    if (open && !wasOpen.current) {
      reset(toInvoiceFormValues(invoice, defaults));
      // Editing keeps the saved lines; a new bill against a PO prefills once its lines load.
      prefilledFor.current = invoice ? (invoice.purchaseOrder?.id ?? null) : null;
    }
    wasOpen.current = open;
  }, [open, invoice, defaults, reset]);

  useEffect(() => {
    if (!open || !hasPurchaseOrder || !billableLines || prefilledFor.current === purchaseOrderId) return;
    prefilledFor.current = purchaseOrderId;
    const lines = linesFromBillable(billableLines);
    if (lines.length === 0) {
      toast.warning('Everything received on this PO is already billed', { description: 'Add lines manually if the vendor billed extra.' });
      return;
    }
    setValue('items', lines, { shouldValidate: false });
  }, [open, hasPurchaseOrder, purchaseOrderId, billableLines, setValue]);

  // Follow the vendor's credit terms until the user picks a due date themselves.
  useEffect(() => {
    if (!open || isEdit || getFieldState('dueDate').isDirty) return;
    setValue('dueDate', dueDateFor(issuedDate, vendor?.paymentTerms));
  }, [open, isEdit, issuedDate, vendor?.paymentTerms, getFieldState, setValue]);

  async function onSubmit(values: InvoiceFormValues): Promise<void> {
    const input = toInvoiceInput(values);
    try {
      const saved = invoice
        ? await updateInvoice.mutateAsync({ id: invoice.id, input })
        : await createInvoice.mutateAsync(input);
      toast.success(invoice ? `${saved.invoiceNumber} updated` : `${saved.invoiceNumber} saved as draft`, {
        description: saved.matchStatus === 'VARIANCE' ? "It doesn't fully match the PO and receipts. Check the variance before submitting." : undefined,
      });
      onOpenChange(false);
      onSaved?.(saved.id);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save the invoice. Try again."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${invoice.invoiceNumber}` : 'Record Vendor Invoice'}</DialogTitle>
          <DialogDescription>
            Bills against a purchase order are checked against what was ordered and received before payment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Vendor" error={errors.vendorId?.message}>
              <Controller control={control} name="vendorId" render={({ field }) => (
                <Select
                  value={field.value}
                  disabled={isEdit}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setValue('purchaseOrderId', NO_PURCHASE_ORDER);
                  }}
                >
                  <SelectTrigger aria-label="Vendor"><SelectValue placeholder="Select the vendor" /></SelectTrigger>
                  <SelectContent>
                    {vendors.map((option) => <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
            <FormField label="Purchase order" hint={vendorId && vendorOrders.length === 0 ? 'No approved POs with this vendor.' : undefined}>
              <Controller control={control} name="purchaseOrderId" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isEdit || !vendorId}>
                  <SelectTrigger aria-label="Purchase order"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PURCHASE_ORDER}>No purchase order (services, labour…)</SelectItem>
                    {vendorOrders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>{order.poNumber} · {order.project?.name ?? order.category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
            <FormField label="Vendor invoice no." htmlFor="invoice-number" error={errors.invoiceNumber?.message}>
              <Input id="invoice-number" placeholder="e.g. TSL/26-27/0412" {...register('invoiceNumber')} />
            </FormField>
            {hasPurchaseOrder ? (
              <FormField label="Project">
                <Input value={approvedOrders.find((order) => order.id === purchaseOrderId)?.project?.name ?? '—'} readOnly aria-label="Project" />
              </FormField>
            ) : (
              <FormField label="Project" error={errors.projectId?.message}>
                <Controller control={control} name="projectId" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-label="Project"><SelectValue placeholder="Select a project" /></SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </FormField>
            )}
            <FormField label="Invoice date" htmlFor="invoice-date" error={errors.issuedDate?.message}>
              <Input id="invoice-date" type="date" {...register('issuedDate')} />
            </FormField>
            <FormField
              label="Due date"
              htmlFor="invoice-due"
              hint={vendor?.paymentTerms ? `Vendor terms: ${vendor.paymentTerms}` : undefined}
              error={errors.dueDate?.message}
            >
              <Input id="invoice-due" type="date" {...register('dueDate')} />
            </FormField>
          </div>

          <InvoiceLinesEditor control={control} register={register} errors={errors} billable={billable} />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Description (optional)" htmlFor="invoice-description" error={errors.description?.message}>
              <Input id="invoice-description" placeholder="e.g. TMT bars for Tower C, floors 5-6" {...register('description')} />
            </FormField>
            <FormField label="Notes (optional)" htmlFor="invoice-notes" error={errors.notes?.message}>
              <Textarea id="invoice-notes" rows={1} {...register('notes')} />
            </FormField>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Draft'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
