'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@sitepilot/ui';
import { Archive, Pencil } from 'lucide-react';
import { useArchiveWarehouse, type WarehouseDetail } from '@/hooks/api/use-inventory';
import { getApiErrorMessage } from '@/lib/api/errors';
import { WarehouseFormDialog } from '@/features/inventory/components/WarehouseFormDialog';

interface WarehouseDrawerActionsProps {
  warehouse: WarehouseDetail;
  onArchived: () => void;
}

export function WarehouseDrawerActions({ warehouse, onArchived }: WarehouseDrawerActionsProps): React.ReactElement {
  const archiveWarehouse = useArchiveWarehouse();
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const isEmpty = warehouse.kpis.totalQuantity <= 0;

  async function handleArchive(): Promise<void> {
    try {
      await archiveWarehouse.mutateAsync(warehouse.id);
      toast.success(`${warehouse.name} archived`);
      setArchiveOpen(false);
      onArchived();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't archive the store. Try again."));
    }
  }

  return (
    <div className="shrink-0 border-t bg-background px-5 py-3 grid grid-cols-2 gap-2">
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditOpen(true)}>
        <Pencil className="h-3.5 w-3.5" /> Edit Store
      </Button>
      <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setArchiveOpen(true)}>
        <Archive className="h-3.5 w-3.5" /> Archive
      </Button>

      <WarehouseFormDialog open={editOpen} onOpenChange={setEditOpen} warehouse={warehouse} />

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Archive {warehouse.name}?</DialogTitle>
            <DialogDescription>
              {isEmpty
                ? 'It disappears from store pickers. Its receipts, transfers and adjustments keep their history.'
                : 'This store still holds stock. Transfer or adjust it to zero before archiving.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setArchiveOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleArchive} disabled={!isEmpty || archiveWarehouse.isPending}>
              {archiveWarehouse.isPending ? 'Archiving…' : 'Archive Store'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
