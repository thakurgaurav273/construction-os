'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Users } from 'lucide-react';
import {
  Button, Input, Label, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, Skeleton,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { useProjects } from '@/hooks/api/use-projects';
import { useAttendanceRoster } from '@/hooks/api/use-workforce';
import { AttendanceRosterForm } from './AttendanceRosterForm';

interface MarkAttendanceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Locks the sheet to one site (project pages); otherwise the user picks a project. */
  projectId?: string;
}

export function MarkAttendanceSheet({ open, onOpenChange, projectId: fixedProjectId }: MarkAttendanceSheetProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  // Undefined means "today" as the server sees it, in the organization's timezone.
  const [date, setDate] = useState<string | undefined>(undefined);
  const projectId = fixedProjectId ?? selectedProjectId;

  const { data: projects = [] } = useProjects();
  const roster = useAttendanceRoster(open && projectId ? projectId : null, date);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[600px] p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-4 border-b space-y-1">
          <SheetTitle>Mark Attendance</SheetTitle>
          <SheetDescription>Record who was on site. Workers you leave unmarked are not saved.</SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 px-5 py-4 border-b">
          {!fixedProjectId && (
            <div className="space-y-1.5">
              <Label>Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger><SelectValue placeholder="Select a site" /></SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="attendance-date">Date</Label>
            <Input
              id="attendance-date"
              type="date"
              max={today}
              value={date ?? roster.data?.date ?? today}
              onChange={(event) => setDate(event.target.value || undefined)}
            />
          </div>
        </div>

        {!projectId && (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">Select a project to load its crew.</p>
        )}
        {projectId && roster.isLoading && (
          <div className="px-5 py-4 space-y-3">
            {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}
          </div>
        )}
        {projectId && roster.isError && (
          <div className="px-5 py-12 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Unable to load the crew for this site.</p>
            <Button variant="outline" size="sm" onClick={() => roster.refetch()}>Retry</Button>
          </div>
        )}
        {roster.data && roster.data.entries.length === 0 && (
          <div className="px-5 py-12 text-center space-y-2">
            <Users className="h-8 w-8 mx-auto text-primary/40" />
            <p className="font-medium">No workers assigned to this site</p>
            <p className="text-sm text-muted-foreground">Assign workers from the Workforce directory, then mark attendance here.</p>
          </div>
        )}
        {roster.data && roster.data.entries.length > 0 && (
          <AttendanceRosterForm
            key={`${projectId}:${roster.data.date}`}
            projectId={projectId}
            roster={roster.data}
            onSaved={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
