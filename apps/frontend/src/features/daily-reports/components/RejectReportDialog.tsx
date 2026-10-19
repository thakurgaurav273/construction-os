'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Label, Textarea,
} from '@sitepilot/ui';
import { FieldError } from './ReportDetailsFields';

const rejectReportSchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, 'Tell the author what needs to change')
    .max(1000, 'Keep the note under 1,000 characters'),
});

type RejectReportValues = z.infer<typeof rejectReportSchema>;

interface RejectReportDialogProps {
  open: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (note: string) => Promise<void>;
}

export function RejectReportDialog({ open, isPending, onOpenChange, onConfirm }: RejectReportDialogProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<RejectReportValues>({
    resolver: zodResolver(rejectReportSchema),
    defaultValues: { note: '' },
  });

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Request changes</DialogTitle>
          <DialogDescription>
            The report goes back to its author to correct and resubmit.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(async ({ note }) => { await onConfirm(note); reset(); })}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="reject-note">What needs to change?</Label>
            <Textarea
              id="reject-note"
              className="min-h-[110px]"
              placeholder="e.g. Labour count doesn't match the gate register; add photos of the slab pour."
              {...register('note')}
            />
            <FieldError message={errors.note?.message} />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Sending…' : 'Send back to author'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
