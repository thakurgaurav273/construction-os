'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input,
} from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { useAddCertification, useUpdateCertification, type Certification, type Worker } from '@/hooks/api/use-workforce';
import { getApiErrorMessage } from '@/lib/api/errors';
import {
  CertificationFormValues, certificationSchema, toCertificationFormValues, toCertificationInput,
} from '../validation/certification.schema';

interface CertificationFormDialogProps {
  worker: Worker;
  /** The certificate being edited; omit to add a new one. */
  certification?: Certification;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CertificationFormDialog({ worker, certification, open, onOpenChange }: CertificationFormDialogProps): React.ReactElement {
  const addCertification = useAddCertification(worker.id);
  const updateCertification = useUpdateCertification(worker.id);
  const isEditing = certification !== undefined;
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CertificationFormValues>({
    resolver: zodResolver(certificationSchema),
    defaultValues: toCertificationFormValues(certification),
  });

  useEffect(() => {
    if (open) reset(toCertificationFormValues(certification));
  }, [open, certification, reset]);

  async function onSubmit(values: CertificationFormValues): Promise<void> {
    const input = toCertificationInput(values);
    try {
      if (certification) await updateCertification.mutateAsync({ certificationId: certification.id, input });
      else await addCertification.mutateAsync(input);
      toast.success(isEditing ? `${input.name} updated` : `${input.name} added for ${worker.name}`);
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save the certificate. Try again."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit certificate' : 'Add certificate'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'To renew it, set the new issue and expiry dates.' : `A certificate ${worker.name} holds.`} Its status follows the expiry date.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField label="Certificate" htmlFor="certification-name" error={errors.name?.message}>
            <Input id="certification-name" placeholder="Safety Induction Certificate" autoFocus {...register('name')} />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Issued by" htmlFor="certification-issuer" error={errors.issuer?.message}>
              <Input id="certification-issuer" placeholder="Optional" {...register('issuer')} />
            </FormField>
            <FormField label="Certificate no." htmlFor="certification-number" error={errors.certificateNumber?.message}>
              <Input id="certification-number" placeholder="Optional" {...register('certificateNumber')} />
            </FormField>
            <FormField label="Issued on" htmlFor="certification-issued" error={errors.issuedOn?.message}>
              <Input id="certification-issued" type="date" {...register('issuedOn')} />
            </FormField>
            <FormField label="Expires on" htmlFor="certification-expires" error={errors.expiresOn?.message} hint="Leave empty if it never expires">
              <Input id="certification-expires" type="date" {...register('expiresOn')} />
            </FormField>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : isEditing ? 'Save' : 'Add certificate'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
