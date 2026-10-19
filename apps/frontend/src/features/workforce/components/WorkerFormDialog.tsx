'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { useProjects } from '@/hooks/api/use-projects';
import { useCreateWorker, useUpdateWorker, type Worker } from '@/hooks/api/use-workforce';
import { getApiErrorMessage } from '@/lib/api/errors';
import { SHIFT_LABELS, TRADE_OPTIONS, WORKER_TYPE_LABELS } from '../constants';
import {
  UNASSIGNED_PROJECT, toWorkerFormValues, toWorkerInput, workerSchema, type WorkerFormValues,
} from '../validation/worker.schema';

interface WorkerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Omit to add a new worker. */
  worker?: Worker;
}

function Field({ label, htmlFor, error, children }: { label: string; htmlFor?: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}

export function WorkerFormDialog({ open, onOpenChange, worker }: WorkerFormDialogProps) {
  const { data: projects = [] } = useProjects();
  const createWorker = useCreateWorker();
  const updateWorker = useUpdateWorker();
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<WorkerFormValues>({
    resolver: zodResolver(workerSchema),
    defaultValues: toWorkerFormValues(worker),
  });

  const tradeOptions = worker && !TRADE_OPTIONS.includes(worker.trade) ? [worker.trade, ...TRADE_OPTIONS] : TRADE_OPTIONS;

  // Reset only as the dialog opens; background refetches of `worker` must not wipe in-progress edits.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) reset(toWorkerFormValues(worker));
    wasOpen.current = open;
  }, [open, worker, reset]);

  async function onSubmit(values: WorkerFormValues): Promise<void> {
    const input = toWorkerInput(values);
    try {
      if (worker) {
        await updateWorker.mutateAsync({ workerId: worker.id, input });
        toast.success(`${input.name} updated`);
      } else {
        await createWorker.mutateAsync(input);
        toast.success(`${input.name} added to the workforce`);
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save the worker. Try again."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{worker ? 'Edit Worker' : 'Add Worker'}</DialogTitle>
          <DialogDescription>
            {worker ? 'Update profile, assignment and contact details.' : 'Register a worker and assign them to a site.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="worker-name" error={errors.name?.message}>
              <Input id="worker-name" placeholder="e.g. Rajesh Kumar" {...register('name')} />
            </Field>
            <Field label="Role" htmlFor="worker-role" error={errors.role?.message}>
              <Input id="worker-role" placeholder="e.g. Site Supervisor" {...register('role')} />
            </Field>
            <Field label="Trade" error={errors.trade?.message}>
              <Controller control={control} name="trade" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Trade"><SelectValue placeholder="Select a trade" /></SelectTrigger>
                  <SelectContent>
                    {tradeOptions.map((trade) => <SelectItem key={trade} value={trade}>{trade}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </Field>
            <Field label="Assigned project">
              <Controller control={control} name="projectId" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Assigned project"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_PROJECT}>Not assigned</SelectItem>
                    {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </Field>
            <Field label="Employment">
              <Controller control={control} name="type" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Employment type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">{WORKER_TYPE_LABELS.EMPLOYEE}</SelectItem>
                    <SelectItem value="SUBCONTRACTOR">{WORKER_TYPE_LABELS.SUBCONTRACTOR}</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </Field>
            <Field label="Shift">
              <Controller control={control} name="shift" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Shift"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAY">{SHIFT_LABELS.DAY} (starts 8:00 AM)</SelectItem>
                    <SelectItem value="NIGHT">{SHIFT_LABELS.NIGHT} (starts 8:00 PM)</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </Field>
            <Field label="Phone" htmlFor="worker-phone" error={errors.phone?.message}>
              <Input id="worker-phone" type="tel" placeholder="+91 98765 43210" {...register('phone')} />
            </Field>
            <Field label="Email (optional)" htmlFor="worker-email" error={errors.email?.message}>
              <Input id="worker-email" type="email" {...register('email')} />
            </Field>
            <Field label="Experience (years)" htmlFor="worker-experience" error={errors.experienceYears?.message}>
              <Input id="worker-experience" type="number" min={0} max={60} {...register('experienceYears')} />
            </Field>
            <Field label="Supervisor" htmlFor="worker-supervisor" error={errors.supervisor?.message}>
              <Input id="worker-supervisor" placeholder="e.g. Ananya Krishnan" {...register('supervisor')} />
            </Field>
          </div>

          <Field label="Skills (comma separated)" htmlFor="worker-skills" error={errors.skills?.message}>
            <Input id="worker-skills" placeholder="Formwork, Concrete Pouring, Survey Reading" {...register('skills')} />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" {...register('ppeCompliant')} />
            Issued full PPE and compliant
          </label>

          <fieldset className="space-y-3 rounded-lg border p-3">
            <legend className="px-1 text-sm font-medium">Emergency contact (optional)</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input aria-label="Emergency contact name" placeholder="Name" {...register('emergencyName')} />
              <Input aria-label="Emergency contact phone" placeholder="Phone" type="tel" {...register('emergencyPhone')} />
              <Input aria-label="Relation" placeholder="Relation" {...register('emergencyRelation')} />
            </div>
            {errors.emergencyName?.message && (
              <p className="text-xs text-destructive" role="alert">{errors.emergencyName.message}</p>
            )}
          </fieldset>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : worker ? 'Save Changes' : 'Add Worker'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
