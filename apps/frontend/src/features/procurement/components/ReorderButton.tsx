'use client';

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, type ButtonProps } from '@sitepilot/ui';
import { Loader2, Truck } from 'lucide-react';
import { useCan } from '@/hooks/api/use-access';
import { fetchReorderSuggestion } from '@/hooks/api/use-procurement';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatCurrency } from '@/lib/utils';
import { DEFAULT_GST_PERCENT } from '../constants';
import type { ReorderSuggestion } from '../types';
import type { PurchaseOrderFormValues } from '../validation/purchase-order.schema';
import { PurchaseOrderFormDialog } from './PurchaseOrderFormDialog';

interface ReorderButtonProps {
  materialId: string;
  /** Plan for one store; omit to plan for the whole organization. */
  warehouseId?: string;
  size?: ButtonProps['size'];
  variant?: ButtonProps['variant'];
  className?: string;
}

function toPrefill(suggestion: ReorderSuggestion): Partial<PurchaseOrderFormValues> {
  const { material, lastPurchase } = suggestion;
  return {
    projectId: suggestion.projectId ?? '',
    vendorId: lastPurchase?.vendor?.id ?? '',
    category: suggestion.category,
    deliveryAddress: suggestion.deliveryAddress,
    notes: `Reorder of ${material.name}${suggestion.warehouse ? ` for ${suggestion.warehouse.name}` : ''}.`,
    items: [{
      materialId: material.id,
      description: material.name,
      unit: material.unit,
      quantity: suggestion.suggestedQuantity,
      rate: lastPurchase?.rate ?? material.unitCost,
      taxPercent: lastPurchase?.taxPercent ?? DEFAULT_GST_PERCENT,
      discountPercent: 0,
    }],
  };
}

function ReorderContext({ suggestion }: { suggestion: ReorderSuggestion }): React.ReactElement {
  const { material, lastPurchase } = suggestion;
  const pending = suggestion.onOrder + suggestion.inApproval;
  return (
    <>
      <p className="font-medium text-foreground">
        Suggested {suggestion.suggestedQuantity} {material.unit} of {material.name}
      </p>
      <p className="mt-0.5">
        {suggestion.available} available against a reorder level of {suggestion.reorderLevel} (target {suggestion.targetLevel})
        {pending > 0 && `; ${pending} ${material.unit} already on order or awaiting approval`}.
        {lastPurchase
          ? ` Last bought on ${lastPurchase.poNumber} at ${formatCurrency(lastPurchase.rate)}/${material.unit}${lastPurchase.vendor ? ` from ${lastPurchase.vendor.name}` : ''}.`
          : ' Never bought on a PO yet, so the rate is the current stock cost. Pick a vendor.'}
      </p>
    </>
  );
}

/** Plans a restock from current stock, open orders and the last purchase, then opens a prefilled draft PO. */
export function ReorderButton({
  materialId, warehouseId, size = 'sm', variant = 'outline', className = '',
}: ReorderButtonProps): React.ReactElement | null {
  const can = useCan();
  const queryClient = useQueryClient();
  const [suggestion, setSuggestion] = useState<ReorderSuggestion | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);

  if (!can('po.create')) return null;

  async function planReorder(): Promise<void> {
    setIsPlanning(true);
    try {
      const planned = await queryClient.fetchQuery({
        queryKey: ['procurement', 'reorder', materialId, warehouseId ?? 'all'],
        queryFn: () => fetchReorderSuggestion(materialId, warehouseId),
        staleTime: 0,
      });
      if (planned.suggestedQuantity <= 0) {
        toast.info(`${planned.material.name} doesn't need a reorder`, {
          description: `${planned.available} available and ${planned.onOrder + planned.inApproval} on order already cover the target of ${planned.targetLevel} ${planned.material.unit}.`,
        });
        return;
      }
      setSuggestion(planned);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't plan the reorder. Try again."));
    } finally {
      setIsPlanning(false);
    }
  }

  return (
    <>
      <Button size={size} variant={variant} className={`gap-1.5 ${className}`} onClick={planReorder} disabled={isPlanning}>
        {isPlanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />} Reorder
      </Button>
      {suggestion && (
        <PurchaseOrderFormDialog
          open
          onOpenChange={(open) => { if (!open) setSuggestion(null); }}
          prefill={toPrefill(suggestion)}
          context={<ReorderContext suggestion={suggestion} />}
        />
      )}
    </>
  );
}
