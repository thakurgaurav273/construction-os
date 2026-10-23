'use client';

import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@sitepilot/ui';
import type { ProjectOption } from '@/hooks/api/use-projects';

interface SelectProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectOption[];
  isLoading: boolean;
}

export function SelectProjectDialog({ open, onOpenChange, projects, isLoading }: SelectProjectDialogProps) {
  const router = useRouter();

  function startReport(projectId: string): void {
    onOpenChange(false);
    router.push(`/dashboard/projects/${projectId}/daily-reports/new`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Select a Project</DialogTitle>
          <DialogDescription>Daily reports are recorded per project site.</DialogDescription>
        </DialogHeader>
        <div className="mt-2 max-h-72 overflow-y-auto space-y-1">
          {isLoading && <p className="text-sm text-muted-foreground py-4 text-center">Loading projects…</p>}
          {!isLoading && projects.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No projects yet. Create a project before recording daily reports.
            </p>
          )}
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none transition-colors"
              onClick={() => startReport(project.id)}
            >
              {project.name}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
