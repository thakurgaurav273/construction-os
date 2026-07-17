'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Button, Input, Label, Textarea,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import {
  useCreateProject, useUpdateProject,
  type CreateProjectInput, type ProjectDetail,
} from '@/hooks/api/use-projects';

const STATUS_OPTIONS = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'ARCHIVED'] as const;
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

function humanize(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function toDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectDetail;
}

interface FormState {
  name: string;
  code: string;
  description: string;
  clientName: string;
  location: string;
  status: string;
  priority: string;
  budget: string;
  progress: string;
  startDate: string;
  expectedCompletion: string;
}

function emptyForm(): FormState {
  return {
    name: '', code: '', description: '', clientName: '', location: '',
    status: 'PLANNING', priority: 'MEDIUM', budget: '', progress: '0',
    startDate: '', expectedCompletion: '',
  };
}

function fromProject(project: ProjectDetail): FormState {
  return {
    name: project.name,
    code: project.code,
    description: project.description ?? '',
    clientName: project.clientName ?? '',
    location: project.location ?? '',
    status: project.status,
    priority: project.priority,
    budget: project.budget != null ? String(project.budget) : '',
    progress: String(project.progress),
    startDate: toDateInput(project.startDate),
    expectedCompletion: toDateInput(project.expectedCompletion),
  };
}

export function ProjectFormDialog({ open, onOpenChange, project }: ProjectFormDialogProps): React.ReactElement {
  const isEdit = Boolean(project);
  const [form, setForm] = useState<FormState>(emptyForm);

  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const isPending = createProject.isPending || updateProject.isPending;

  useEffect(() => {
    if (open) setForm(project ? fromProject(project) : emptyForm());
  }, [open, project]);

  function update(patch: Partial<FormState>): void {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function buildPayload(): CreateProjectInput {
    const budget = form.budget.trim() === '' ? undefined : Number(form.budget);
    const progress = form.progress.trim() === '' ? undefined : Number(form.progress);
    return {
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim() || undefined,
      clientName: form.clientName.trim() || undefined,
      location: form.location.trim() || undefined,
      status: form.status,
      priority: form.priority,
      budget: Number.isFinite(budget) ? budget : undefined,
      progress: Number.isFinite(progress) ? progress : undefined,
      startDate: form.startDate || undefined,
      expectedCompletion: form.expectedCompletion || undefined,
    };
  }

  async function handleSubmit(): Promise<void> {
    if (!form.name.trim()) {
      toast.error('Project name is required.');
      return;
    }
    if (!form.code.trim()) {
      toast.error('Project code is required.');
      return;
    }

    const payload = buildPayload();

    try {
      if (isEdit && project) {
        await updateProject.mutateAsync({ id: project.id, data: payload });
        toast.success('Project updated');
      } else {
        await createProject.mutateAsync(payload);
        toast.success('Project created');
      }
      onOpenChange(false);
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || `Unable to ${isEdit ? 'update' : 'create'} the project. Please try again.`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Project' : 'New Project'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the details for this project.' : 'Create a new project for your organisation.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                placeholder="Skyline Residency Tower B"
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-code">Code</Label>
              <Input
                id="project-code"
                placeholder="PRJ-024"
                value={form.code}
                onChange={(e) => update({ code: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              rows={3}
              placeholder="Short summary of the project scope..."
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="project-client">Client</Label>
              <Input
                id="project-client"
                placeholder="Prestige Group"
                value={form.clientName}
                onChange={(e) => update({ clientName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-location">Location</Label>
              <Input
                id="project-location"
                placeholder="Bengaluru, KA"
                value={form.location}
                onChange={(e) => update({ location: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update({ status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{humanize(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => update({ priority: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>{humanize(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="project-budget">Budget (₹)</Label>
              <Input
                id="project-budget"
                type="number"
                min={0}
                step="any"
                placeholder="120000000"
                value={form.budget}
                onChange={(e) => update({ budget: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-progress">Progress (%)</Label>
              <Input
                id="project-progress"
                type="number"
                min={0}
                max={100}
                placeholder="0"
                value={form.progress}
                onChange={(e) => update({ progress: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="project-start">Start Date</Label>
              <Input
                id="project-start"
                type="date"
                value={form.startDate}
                onChange={(e) => update({ startDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-completion">Expected Completion</Label>
              <Input
                id="project-completion"
                type="date"
                value={form.expectedCompletion}
                onChange={(e) => update({ expectedCompletion: e.target.value })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending
              ? isEdit ? 'Saving...' : 'Creating...'
              : isEdit ? 'Save Changes' : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
