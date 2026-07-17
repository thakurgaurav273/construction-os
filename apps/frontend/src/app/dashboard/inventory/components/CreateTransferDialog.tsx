'use client';

import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Button, Input, Label, Textarea,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import {
  useWarehouses, useInventoryItems, useCreateTransfer,
} from '@/hooks/api/use-inventory';

interface CreateTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LineItem {
  key: string;
  materialId: string;
  quantity: string;
}

let lineKeySeq = 0;
function newLine(): LineItem {
  lineKeySeq += 1;
  return { key: `line-${lineKeySeq}`, materialId: '', quantity: '' };
}

export function CreateTransferDialog({ open, onOpenChange }: CreateTransferDialogProps): React.ReactElement {
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<LineItem[]>([newLine()]);

  const { data: warehouses } = useWarehouses();
  const { data: sourceStock } = useInventoryItems(
    fromWarehouseId ? { warehouseId: fromWarehouseId, limit: 100, sort: 'materialName', order: 'asc' } : {},
  );
  const createTransfer = useCreateTransfer();

  const materialOptions = useMemo(() => {
    const sourceItems = fromWarehouseId ? sourceStock?.items ?? [] : [];
    return sourceItems.map((item) => ({
      id: item.materialId,
      name: item.materialName,
      unit: item.unit,
      available: item.available,
    }));
  }, [fromWarehouseId, sourceStock]);

  function reset(): void {
    setFromWarehouseId('');
    setToWarehouseId('');
    setNote('');
    setLines([newLine()]);
  }

  function updateLine(key: string, patch: Partial<LineItem>): void {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string): void {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  async function handleSubmit(): Promise<void> {
    if (!fromWarehouseId || !toWarehouseId) {
      toast.error('Select both an origin and destination warehouse.');
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      toast.error('Origin and destination warehouses must differ.');
      return;
    }
    const items = lines
      .filter((l) => l.materialId && Number(l.quantity) > 0)
      .map((l) => ({ materialId: l.materialId, quantity: Number(l.quantity) }));
    if (items.length === 0) {
      toast.error('Add at least one material with a quantity greater than zero.');
      return;
    }

    try {
      await createTransfer.mutateAsync({
        fromWarehouseId,
        toWarehouseId,
        note: note.trim() || undefined,
        items,
      });
      toast.success('Transfer created');
      reset();
      onOpenChange(false);
    } catch {
      toast.error('Unable to create the transfer. Please try again.');
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>New Stock Transfer</DialogTitle>
          <DialogDescription>Move stock between warehouses. It starts as a pending request.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-end gap-3">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Select value={fromWarehouseId} onValueChange={(v) => { setFromWarehouseId(v); setLines([newLine()]); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Origin warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {(warehouses ?? []).map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground mb-2.5 hidden sm:block" />
            <div className="space-y-1.5">
              <Label>To</Label>
              <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Destination warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {(warehouses ?? [])
                    .filter((w) => w.id !== fromWarehouseId)
                    .map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Items</Label>
            {!fromWarehouseId ? (
              <p className="text-xs text-muted-foreground">Select an origin warehouse to choose materials.</p>
            ) : (
              <div className="space-y-2">
                {lines.map((line) => {
                  const selected = materialOptions.find((m) => m.id === line.materialId);
                  return (
                    <div key={line.key} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <Select value={line.materialId} onValueChange={(v) => updateLine(line.key, { materialId: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select material" />
                          </SelectTrigger>
                          <SelectContent>
                            {materialOptions.map((m) => (
                              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        placeholder="Qty"
                        className="w-24"
                        value={line.quantity}
                        onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                      />
                      <span className="text-xs text-muted-foreground w-10 shrink-0">{selected?.unit ?? ''}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 shrink-0"
                        onClick={() => removeLine(line.key)}
                        disabled={lines.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                <Button type="button" variant="outline" size="sm" onClick={() => setLines((prev) => [...prev, newLine()])}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add item
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="transfer-note">Note (optional)</Label>
            <Textarea
              id="transfer-note"
              rows={2}
              placeholder="Reason for the transfer..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={createTransfer.isPending}>
            {createTransfer.isPending ? 'Creating...' : 'Create Transfer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
