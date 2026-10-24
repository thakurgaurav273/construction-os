'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton,
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@sitepilot/ui';
import { AlertTriangle, Download, FileSpreadsheet, Trash2, Upload } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useCan } from '@/hooks/api/use-access';
import {
  useDeleteImportTemplate, useExportWithTemplate, useImportEntities, useImportTemplates, type ImportTemplate,
} from '@/hooks/api/use-data-import';
import { getApiErrorMessage } from '@/lib/api/errors';
import { ENTITY_PRESENTATION } from '../import-entities';

/** Settings → Data import: the sheet layouts SitePilot has learned, and exports in those same layouts. */
export function ImportTemplatesTab(): React.ReactElement {
  const canImport = useCan()('data.import');
  const { data: templates, isLoading, isError, refetch } = useImportTemplates({ enabled: canImport });
  const { data: entities = [] } = useImportEntities();
  const exportData = useExportWithTemplate();
  const deleteTemplate = useDeleteImportTemplate();
  const [deleting, setDeleting] = useState<ImportTemplate | null>(null);

  if (!canImport) {
    return (
      <EmptyState
        icon={FileSpreadsheet}
        title="Spreadsheet import is for admins"
        description="Owners and admins can import data from your organization’s own sheets and export it back in the same layout."
      />
    );
  }
  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-20 w-full rounded-xl" />)}</div>;
  if (isError || !templates) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load sheet layouts"
        description="Check your connection and try again."
        action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  async function handleExport(template: ImportTemplate): Promise<void> {
    try {
      const count = await exportData.mutateAsync(template.id);
      toast.success(`Exported ${count} rows in the “${template.name}” layout`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t export. Try again.'));
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleting) return;
    try {
      await deleteTemplate.mutateAsync(deleting.id);
      toast.success(`Deleted the “${deleting.name}” layout`);
      setDeleting(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t delete the layout. Try again.'));
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div className="space-y-1.5">
            <CardTitle>Sheet layouts</CardTitle>
            <CardDescription>
              Each layout remembers how one of your spreadsheet formats maps to SitePilot. Uploads in a known layout import without re-mapping, and you can export current data in the same format.
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/dashboard/imports"><Upload className="mr-1.5 h-4 w-4" /> Import a sheet</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <EmptyState
              icon={FileSpreadsheet}
              title="No layouts yet"
              description="Import your first sheet. Once you confirm its columns, the layout is saved here."
            />
          ) : (
            <ul className="divide-y rounded-lg border">
              {templates.map((template) => {
                const Icon = ENTITY_PRESENTATION[template.entity].icon;
                return (
                  <li key={template.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{template.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {template.headers.length} columns · {template.lastUsedAt
                            ? `last used ${formatDistanceToNow(new Date(template.lastUsedAt), { addSuffix: true })}`
                            : 'not used yet'}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">{entities.find((entity) => entity.entity === template.entity)?.label}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={exportData.isPending} onClick={() => { void handleExport(template); }}>
                        <Download className="mr-1.5 h-4 w-4" /> Export data
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive/90"
                        aria-label={`Delete ${template.name}`}
                        onClick={() => setDeleting(template)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleting !== null} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this layout?</DialogTitle>
            <DialogDescription>
              Records already imported stay as they are. The next sheet in the “{deleting?.name}” format will need its columns matched again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" loading={deleteTemplate.isPending} onClick={() => { void handleDelete(); }}>Delete layout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
