'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@sitepilot/ui';
import { PackageMinus, X } from 'lucide-react';
import { useMaterialRecovery, useRecoverMaterials, useRemoveRecovery } from '@/hooks/api/use-billing';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { RaBillDetail } from '../../types';
import { formatAmount, formatQuantity } from '../../utils/format';

/**
 * Material we issued to this subcontractor, recovered as a deduction on their bill. Shown on subcontract
 * bills only; changes are possible while the bill can be edited.
 */
export function MaterialRecoveryCard({ bill, editable }: { bill: RaBillDetail; editable: boolean }): React.ReactElement | null {
  const isSubcontract = bill.contract.direction === 'SUBCONTRACT';
  const { data, isLoading } = useMaterialRecovery(bill.id, isSubcontract);
  const recover = useRecoverMaterials();
  const remove = useRemoveRecovery();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (!isSubcontract) return null;
  if (isLoading || !data) return <Skeleton className="h-32 w-full rounded-xl" />;
  if (data.onBill.length === 0 && (!editable || data.pending.length === 0)) return null;

  async function recoverSelected(): Promise<void> {
    try {
      await recover.mutateAsync({ billId: bill.id, materialIds: [...selected] });
      toast.success('Material recovery added to the bill');
      setSelected(new Set());
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t add the recovery. Try again.'));
    }
  }

  async function removeLine(adjustmentId: string): Promise<void> {
    try {
      await remove.mutateAsync({ billId: bill.id, adjustmentId });
      toast.success('Recovery removed; the material can be recovered later');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t remove the recovery. Try again.'));
    }
  }

  const toggle = (materialId: string): void => setSelected((current) => {
    const next = new Set(current);
    if (next.has(materialId)) next.delete(materialId);
    else next.add(materialId);
    return next;
  });
  const selectedAmount = data.pending.filter((material) => selected.has(material.materialId)).reduce((sum, material) => sum + material.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Material recovery</CardTitle>
        <CardDescription>Material issued from our stores to this subcontractor, deducted from their bill at the recovery rate.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.onBill.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {data.onBill.map((line) => (
              <li key={line.adjustmentId} className="flex items-center gap-3 px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{line.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{line.codes.join(', ')}</p>
                </div>
                <span className="tabular-nums">− {formatAmount(line.amount)}</span>
                {editable && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Remove ${line.label}`} disabled={remove.isPending} onClick={() => { void removeLine(line.adjustmentId); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {editable && data.pending.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Not recovered yet</p>
            <ul className="space-y-2">
              {data.pending.map((material) => (
                <li key={material.materialId}>
                  <label className="flex items-start gap-3 rounded-lg border px-3 py-2 text-sm">
                    <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-input" checked={selected.has(material.materialId)} onChange={() => toggle(material.materialId)} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{material.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatQuantity(material.quantity)} {material.unit} ({formatQuantity(material.issued)} issued{material.returned > 0 ? `, ${formatQuantity(material.returned)} returned` : ''}) · {material.notes.join(', ')}
                      </span>
                    </span>
                    <span className="tabular-nums">{formatAmount(material.amount)}</span>
                  </label>
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full" disabled={selected.size === 0 || recover.isPending} onClick={() => { void recoverSelected(); }}>
              <PackageMinus className="mr-2 h-4 w-4" /> {selected.size === 0 ? 'Choose material to recover' : `Recover ${formatAmount(selectedAmount)} on this bill`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
