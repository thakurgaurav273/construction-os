'use client';

import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { useInviteMember } from '@/hooks/api/use-settings';
import { getApiErrorMessage } from '@/lib/api/errors';
import { ROLE_SUMMARIES, formatRole, type OrgRole } from '../constants';
import { inviteMemberSchema, type InviteMemberFormValues } from '../validation/member.schema';

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignableRoles: readonly OrgRole[];
}

const DEFAULT_VALUES: InviteMemberFormValues = { email: '', role: 'VIEWER' };

export function InviteMemberDialog({ open, onOpenChange, assignableRoles }: InviteMemberDialogProps): React.ReactElement {
  const inviteMember = useInviteMember();
  const { register, control, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const selectedRole = watch('role');

  function close(nextOpen: boolean): void {
    if (!nextOpen) reset(DEFAULT_VALUES);
    onOpenChange(nextOpen);
  }

  async function onSubmit(values: InviteMemberFormValues): Promise<void> {
    try {
      await inviteMember.mutateAsync(values);
      toast.success(`Invitation sent to ${values.email}`);
      close(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't send the invitation. Try again."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>They’ll get an email with a link to join this workspace. The link works for 7 days.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField label="Email" htmlFor="invite-email" error={errors.email?.message}>
            <Input id="invite-email" type="email" placeholder="name@company.com" autoComplete="off" autoFocus {...register('email')} />
          </FormField>
          <FormField label="Role" error={errors.role?.message} hint={ROLE_SUMMARIES[selectedRole]}>
            <Controller control={control} name="role" render={({ field }) => (
              <Select value={field.value} onValueChange={(value) => { if (value) field.onChange(value); }}>
                <SelectTrigger aria-label="Role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((role) => <SelectItem key={role} value={role}>{formatRole(role)}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending…' : 'Send Invitation'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
