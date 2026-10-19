'use client';

import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Label,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { useProjects } from '@/hooks/api/use-projects';
import { useUpdateWorker, type Worker } from '@/hooks/api/use-workforce';
import { getApiErrorMessage } from '@/lib/api/errors';

const assignProjectSchema = z.object({ projectId: z.string().min(1, 'Select a project') });
type AssignProjectValues = z.infer<typeof assignProjectSchema>;

interface AssignProjectDialogProps {
  worker: Worker;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignProjectDialog({ worker, open, onOpenChange }: AssignProjectDialogProps) {
  const { data: projects = [] } = useProjects();
  const updateWorker = useUpdateWorker();
  const { control, handleSubmit, reset, formState: { errors } } = useForm<AssignProjectValues>({
    resolver: zodResolver(assignProjectSchema),
    defaultValues: { projectId: worker.projectId ?? '' },
  });

  useEffect(() => {
    if (open) reset({ projectId: worker.projectId ?? '' });
  }, [open, worker.projectId, reset]);

  async function onSubmit({ projectId }: AssignProjectValues): Promise<void> {
    try {
      await updateWorker.mutateAsync({ workerId: worker.id, input: { projectId } });
      const projectName = projects.find((project) => project.id === projectId)?.name ?? 'the project';
      toast.success(`${worker.name} assigned to ${projectName}`);
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't assign the worker. Try again."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Assign Project</DialogTitle>
          <DialogDescription>
            {worker.name} will appear on this site&apos;s attendance roster from today.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Controller control={control} name="projectId" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-label="Project"><SelectValue placeholder="Select a project" /></SelectTrigger>
                <SelectContent>
                  {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
            {errors.projectId && <p className="text-xs text-destructive" role="alert">{errors.projectId.message}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={updateWorker.isPending}>
              {updateWorker.isPending ? 'Assigning…' : 'Assign'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
