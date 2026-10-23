'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@sitepilot/ui';
import { Archive, ArchiveRestore, MoreHorizontal, Trash2 } from 'lucide-react';
import { useArchiveProject, useDeleteProject, useRestoreProject, type ProjectDetail } from '@/hooks/api/use-projects';
import { useCan } from '@/hooks/api/use-access';
import { getApiErrorMessage } from '@/lib/api/errors';

type PendingAction = 'archive' | 'delete' | null;

const CONFIRM_COPY: Record<Exclude<PendingAction, null>, { title: string; description: string; confirm: string }> = {
  archive: {
    title: 'Archive this project?',
    description: 'It leaves day-to-day lists and pickers, and nothing new can be recorded on it. Everything stays readable, and you can restore it at any time.',
    confirm: 'Archive Project',
  },
  delete: {
    title: 'Delete this project?',
    description: 'Only for projects created by mistake. Projects with reports, orders, invoices, stock, workers or documents can’t be deleted; archive them instead.',
    confirm: 'Delete Project',
  },
};

/** Less frequent, higher-impact project actions, kept out of the header's main buttons. */
export function ProjectActionsMenu({ project }: { project: ProjectDetail }): React.ReactElement | null {
  const router = useRouter();
  const can = useCan();
  const archiveProject = useArchiveProject();
  const restoreProject = useRestoreProject();
  const deleteProject = useDeleteProject();
  const [pending, setPending] = useState<PendingAction>(null);
  const isArchived = project.status === 'ARCHIVED';
  const canUpdate = can('project.update');
  const canDelete = can('project.delete');
  if (!canUpdate && !canDelete) return null;

  async function restore(): Promise<void> {
    try {
      await restoreProject.mutateAsync({ id: project.id });
      toast.success(`${project.name} restored`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't restore the project. Try again."));
    }
  }

  async function confirm(): Promise<void> {
    try {
      if (pending === 'archive') {
        await archiveProject.mutateAsync({ id: project.id });
        toast.success(`${project.name} archived`);
      } else if (pending === 'delete') {
        await deleteProject.mutateAsync({ id: project.id });
        toast.success(`${project.name} deleted`);
        router.replace('/dashboard/projects');
      }
      setPending(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't complete that. Try again."));
    }
  }

  const isWorking = archiveProject.isPending || deleteProject.isPending || restoreProject.isPending;
  const copy = pending ? CONFIRM_COPY[pending] : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="More project actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canUpdate && (isArchived ? (
            <DropdownMenuItem onSelect={() => { void restore(); }}>
              <ArchiveRestore className="mr-2 h-4 w-4" /> Restore project
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setPending('archive')}>
              <Archive className="mr-2 h-4 w-4" /> Archive project
            </DropdownMenuItem>
          ))}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setPending('delete')} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete project
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!pending} onOpenChange={(open) => { if (!open) setPending(null); }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{copy?.title}</DialogTitle>
            <DialogDescription>{copy?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPending(null)} disabled={isWorking}>Cancel</Button>
            <Button variant={pending === 'delete' ? 'destructive' : 'default'} onClick={() => { void confirm(); }} disabled={isWorking}>
              {isWorking ? 'Working…' : copy?.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
