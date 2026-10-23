'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Textarea } from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import type { AiAccessRequest } from '@/hooks/api/use-ai';
import { useApproveAiRequest } from '@/hooks/api/use-platform';
import { getApiErrorMessage } from '@/lib/api/errors';

const schema = z.object({
  grantedRequests: z.coerce.number().int().min(1, 'At least 1').max(100_000),
  days: z.coerce.number().int().min(1, 'At least 1 day').max(365, 'At most 365 days'),
  note: z.string().trim().max(1000),
});

type Values = z.infer<typeof schema>;

/** Approve with the asked-for amount (14 days by default), or adjust before granting. */
export function ApproveRequestDialog({ request, onClose }: { request: AiAccessRequest | null; onClose: () => void }): React.ReactElement {
  const approve = useApproveAiRequest();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { grantedRequests: 100, days: 14, note: '' },
  });

  useEffect(() => {
    if (request) reset({ grantedRequests: request.requestedRequests, days: 14, note: '' });
  }, [request, reset]);

  async function submit(values: Values): Promise<void> {
    if (!request) return;
    try {
      await approve.mutateAsync({ id: request.id, ...values });
      toast.success(`Approved for ${request.organizationName}`);
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t approve the request.'));
    }
  }

  return (
    <Dialog open={!!request} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Approve {request?.kind === 'TRIAL' ? 'free trial' : 'more usage'}</DialogTitle>
          <DialogDescription>
            {request?.organizationName} will use the platform&apos;s default AI key until the requests run out or the time ends.
            Top-ups extend any allowance they already have.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Requests" htmlFor="grant-requests" error={errors.grantedRequests?.message}>
              <Input id="grant-requests" type="number" min={1} {...register('grantedRequests')} />
            </FormField>
            <FormField label="Days" htmlFor="grant-days" error={errors.days?.message}>
              <Input id="grant-days" type="number" min={1} max={365} {...register('days')} />
            </FormField>
          </div>
          <FormField label="Note to the tenant (optional)" htmlFor="grant-note" error={errors.note?.message}>
            <Textarea id="grant-note" rows={2} {...register('note')} />
          </FormField>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Approving…' : 'Approve'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
