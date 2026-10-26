'use client';

import React, { useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@sitepilot/ui';
import { Trash2, Upload } from 'lucide-react';
import type { User } from '@sitepilot/types';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { useRemoveAvatar, useUploadAvatar } from '@/hooks/api/use-account';
import { getApiErrorMessage } from '@/lib/api/errors';
import { IMAGE_UPLOAD_TYPES, imageUploadError } from '@/lib/image-upload';

/** Your photo, shown next to your name on teams, member lists and the sidebar in every organization. */
export function ProfilePhoto({ user }: { user: User }): React.ReactElement {
  const upload = useUploadAvatar();
  const remove = useRemoveAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busy = upload.isPending || remove.isPending;

  async function handleSelect(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const problem = imageUploadError(file, 'photo');
    if (problem) {
      toast.error(problem);
      return;
    }
    try {
      await upload.mutateAsync(file);
      toast.success('Photo updated');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t upload the photo. Try again.'));
    }
  }

  async function handleRemove(): Promise<void> {
    try {
      await remove.mutateAsync();
      toast.success('Photo removed');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t remove the photo. Try again.'));
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <UserAvatar name={user.name || user.email} avatar={user.avatar} className="h-20 w-20" fallbackClassName="text-xl" />
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_UPLOAD_TYPES.join(',')}
          className="hidden"
          aria-label="Upload photo"
          onChange={(event) => { void handleSelect(event); }}
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> {upload.isPending ? 'Uploading…' : user.avatar ? 'Change Photo' : 'Upload Photo'}
          </Button>
          {user.avatar && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive/90"
              disabled={busy}
              onClick={() => { void handleRemove(); }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">PNG, JPG or WebP, up to 2 MB. A square photo of your face works best.</p>
      </div>
    </div>
  );
}
