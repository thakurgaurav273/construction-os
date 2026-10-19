'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Textarea,
} from '@sitepilot/ui';
import { z } from 'zod';
import { FormField } from './FormField';

/** Matches the backend's note limit for approvals, rejections and cancellations. */
const MAX_NOTE_LENGTH = 1000;

const reviewNoteSchema = (required: boolean) =>
  z.object({
    note: required
      ? z.string().trim().min(3, 'Add a note explaining the decision').max(MAX_NOTE_LENGTH)
      : z.string().trim().max(MAX_NOTE_LENGTH),
  });

type ReviewNoteFormValues = { note: string };

export interface ReviewNoteRequest {
  title: string;
  description: string;
  confirmLabel: string;
  /** Rejections, change requests and approval overrides must explain themselves. */
  noteRequired: boolean;
  destructive?: boolean;
  onConfirm: (note: string) => Promise<void>;
}

interface ReviewNoteDialogProps {
  request: ReviewNoteRequest | null;
  onClose: () => void;
}

export function ReviewNoteDialog({ request, onClose }: ReviewNoteDialogProps): React.ReactElement {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ReviewNoteFormValues>({
    resolver: zodResolver(reviewNoteSchema(request?.noteRequired ?? false)),
    defaultValues: { note: '' },
  });

  useEffect(() => {
    if (request) reset({ note: '' });
  }, [request, reset]);

  async function onSubmit(values: ReviewNoteFormValues): Promise<void> {
    if (!request) return;
    // The caller reports failures; the dialog stays open so the note isn't lost.
    try {
      await request.onConfirm(values.note);
      onClose();
    } catch {
      /* handled by onConfirm */
    }
  }

  return (
    <Dialog open={!!request} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{request?.title}</DialogTitle>
          <DialogDescription>{request?.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            label={request?.noteRequired ? 'Note to requester' : 'Note (optional)'}
            htmlFor="review-note"
            error={errors.note?.message}
          >
            <Textarea id="review-note" rows={3} autoFocus {...register('note')} />
          </FormField>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Back</Button>
            <Button type="submit" variant={request?.destructive ? 'destructive' : 'default'} disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : request?.confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
