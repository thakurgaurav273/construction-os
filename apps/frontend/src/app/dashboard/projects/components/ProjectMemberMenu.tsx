'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@sitepilot/ui';
import { MoreHorizontal, UserMinus } from 'lucide-react';
import {
  useChangeProjectMemberRole, useRemoveProjectMember, type ProjectDetail, type ProjectMemberRole,
} from '@/hooks/api/use-projects';
import { getApiErrorMessage } from '@/lib/api/errors';

const PROJECT_ROLES: { value: ProjectMemberRole; label: string }[] = [
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ENGINEER', label: 'Engineer' },
  { value: 'VIEWER', label: 'Viewer' },
];

interface ProjectMemberMenuProps {
  projectId: string;
  member: ProjectDetail['members'][number];
}

/** Change a member's project role or take them off the team. Their recorded work stays on the project. */
export function ProjectMemberMenu({ projectId, member }: ProjectMemberMenuProps): React.ReactElement {
  const changeRole = useChangeProjectMemberRole();
  const removeMember = useRemoveProjectMember();
  const [confirmRemove, setConfirmRemove] = useState(false);

  async function handleRoleChange(role: string): Promise<void> {
    const next = PROJECT_ROLES.find((option) => option.value === role);
    if (!next || next.value === member.role) return;
    try {
      await changeRole.mutateAsync({ id: projectId, userId: member.user.id, role: next.value });
      toast.success(`${member.user.name} is now a project ${next.label.toLowerCase()}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't change the role. Try again."));
    }
  }

  async function handleRemove(): Promise<void> {
    try {
      await removeMember.mutateAsync({ id: projectId, userId: member.user.id });
      toast.success(`${member.user.name} removed from the project`);
      setConfirmRemove(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't remove the member. Try again."));
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="-mt-2 -mr-2" aria-label={`Actions for ${member.user.name}`}>
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Project role</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={member.role} onValueChange={(role) => { void handleRoleChange(role); }}>
            {PROJECT_ROLES.map((role) => (
              <DropdownMenuRadioItem key={role.value} value={role.value} disabled={changeRole.isPending}>
                {role.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setConfirmRemove(true)} className="text-destructive focus:text-destructive">
            <UserMinus className="mr-2 h-4 w-4" /> Remove from project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Remove {member.user.name}?</DialogTitle>
            <DialogDescription>
              They leave this project team. Reports, orders and other records they created stay on the project.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmRemove(false)} disabled={removeMember.isPending}>Cancel</Button>
            <Button variant="destructive" onClick={() => { void handleRemove(); }} disabled={removeMember.isPending}>
              {removeMember.isPending ? 'Removing…' : 'Remove Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
