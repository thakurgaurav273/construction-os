'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Button, Label,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { useAddProjectMember, useProjectAvailableMembers } from '@/hooks/api/use-projects';

const ROLE_OPTIONS = ['MANAGER', 'ENGINEER', 'VIEWER'] as const;

function humanize(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

interface AddMemberDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMemberDialog({ projectId, open, onOpenChange }: AddMemberDialogProps): React.ReactElement {
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<string>('ENGINEER');

  const { data: available, isLoading } = useProjectAvailableMembers(projectId, open);
  const addMember = useAddProjectMember();

  useEffect(() => {
    if (open) {
      setUserId('');
      setRole('ENGINEER');
    }
  }, [open]);

  async function handleSubmit(): Promise<void> {
    if (!userId) {
      toast.error('Select a team member to add.');
      return;
    }
    try {
      await addMember.mutateAsync({ id: projectId, data: { userId, role } });
      toast.success('Member added');
      onOpenChange(false);
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Unable to add the member. Please try again.');
    }
  }

  const members = available ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>Assign someone from your organisation to this project.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Member</Label>
            <Select value={userId} onValueChange={setUserId} disabled={isLoading || members.length === 0}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isLoading
                      ? 'Loading...'
                      : members.length === 0
                        ? 'Everyone is already on this project'
                        : 'Select a member'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} — {m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>{humanize(r)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={addMember.isPending || !userId}>
            {addMember.isPending ? 'Adding...' : 'Add Member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
