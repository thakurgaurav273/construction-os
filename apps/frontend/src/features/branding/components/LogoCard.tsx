'use client';

import React, { useRef } from 'react';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@sitepilot/ui';
import { Building2, Trash2, Upload } from 'lucide-react';
import { useRemoveOrganizationLogo, useUploadOrganizationLogo, type OrganizationSettings } from '@/hooks/api/use-settings';
import { getApiErrorMessage } from '@/lib/api/errors';
import { IMAGE_UPLOAD_TYPES, imageUploadError } from '@/lib/image-upload';

/** The organization logo, shown in the sidebar for every member. Raster images only (an SVG could carry script). */
export function LogoCard({ organization, canManage }: { organization: OrganizationSettings; canManage: boolean }): React.ReactElement {
  const uploadLogo = useUploadOrganizationLogo();
  const removeLogo = useRemoveOrganizationLogo();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busy = uploadLogo.isPending || removeLogo.isPending;

  async function handleSelect(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const problem = imageUploadError(file, 'logo');
    if (problem) {
      toast.error(problem);
      return;
    }
    try {
      await uploadLogo.mutateAsync(file);
      toast.success('Logo updated');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t upload the logo. Try again.'));
    }
  }

  async function handleRemove(): Promise<void> {
    try {
      await removeLogo.mutateAsync();
      toast.success('Logo removed');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t remove the logo. Try again.'));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logo</CardTitle>
        <CardDescription>Shown in the sidebar for everyone in {organization.name}.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-6">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
          {organization.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed storage URL, not a Next.js static asset
            <img src={organization.logoUrl} alt={`${organization.name} logo`} className="h-full w-full object-contain" />
          ) : (
            <Building2 className="h-8 w-8 text-muted-foreground opacity-50" />
          )}
        </div>
        <div className="space-y-2">
          {canManage && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept={IMAGE_UPLOAD_TYPES.join(',')}
                className="hidden"
                aria-label="Upload logo"
                onChange={(event) => { void handleSelect(event); }}
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" /> {uploadLogo.isPending ? 'Uploading…' : 'Upload'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive/90"
                  disabled={!organization.logoUrl || busy}
                  onClick={() => { void handleRemove(); }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Remove
                </Button>
              </div>
            </>
          )}
          <p className="text-xs text-muted-foreground">PNG, JPG or WebP, up to 2 MB. A square image on a transparent or white background works best.</p>
        </div>
      </CardContent>
    </Card>
  );
}
