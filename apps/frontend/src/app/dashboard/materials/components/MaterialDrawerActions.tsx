'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Button,
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@sitepilot/ui';
import { Archive, ArrowUpRight, MoreHorizontal, Pencil, Undo2 } from 'lucide-react';
import { useArchiveMaterial, type MaterialDetail, type SiteStockMovementType } from '@/hooks/api/use-materials';
import { useCan } from '@/hooks/api/use-access';
import { getApiErrorMessage } from '@/lib/api/errors';
import { ReorderButton } from '@/features/procurement/components/ReorderButton';
import { SiteStockDialog } from '@/features/materials/components/SiteStockDialog';
import { MaterialFormDialog } from './MaterialFormDialog';

interface MaterialDrawerActionsProps {
  material: MaterialDetail;
  onArchived: () => void;
}

export function MaterialDrawerActions({ material, onArchived }: MaterialDrawerActionsProps): React.ReactElement {
  const can = useCan();
  const archiveMaterial = useArchiveMaterial();
  const [movementType, setMovementType] = useState<SiteStockMovementType | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const canIssue = can('material.issue');
  const canManage = can('material.manage');
  const isEmpty = material.quantity <= 0 && material.incoming <= 0;

  async function handleArchive(): Promise<void> {
    try {
      await archiveMaterial.mutateAsync(material.id);
      toast.success(`${material.name} archived`);
      setArchiveOpen(false);
      onArchived();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't archive the material. Try again."));
    }
  }

  return (
    <div className="shrink-0 border-t bg-background px-5 py-3 flex items-center gap-2">
      {canIssue && (
        <Button size="sm" className="flex-1 gap-1.5" onClick={() => setMovementType('ISSUE')} disabled={material.available <= 0}>
          <ArrowUpRight className="h-3.5 w-3.5" /> Issue to Project
        </Button>
      )}
      <ReorderButton materialId={material.id} className="flex-1" />
      {(canIssue || canManage) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label="More material actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canIssue && (
              <DropdownMenuItem onSelect={() => setMovementType('RETURN')} disabled={material.projectCount === 0}>
                <Undo2 className="mr-2 h-4 w-4" /> Record return from site
              </DropdownMenuItem>
            )}
            {canManage && (
              <>
                <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setArchiveOpen(true)} className="text-destructive focus:text-destructive">
                  <Archive className="mr-2 h-4 w-4" /> Archive
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <SiteStockDialog
        open={movementType !== null}
        onOpenChange={(open) => { if (!open) setMovementType(null); }}
        type={movementType ?? 'ISSUE'}
        materialId={material.id}
      />
      <MaterialFormDialog open={editOpen} onClose={() => setEditOpen(false)} material={material} />

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Archive {material.name}?</DialogTitle>
            <DialogDescription>
              {isEmpty
                ? 'It will be removed from the catalogue and pickers. Receipts, issues and purchase orders keep their history.'
                : 'This material still has stock on hand or deliveries on the way. Issue, adjust or receive it to zero before archiving.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setArchiveOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleArchive} disabled={!isEmpty || archiveMaterial.isPending}>
              {archiveMaterial.isPending ? 'Archiving…' : 'Archive Material'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
