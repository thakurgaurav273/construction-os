'use client';

import React, { useEffect, useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Textarea,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { Package } from 'lucide-react';
import { FormField } from '@/components/shared/FormField';
import { useReceiveGoods } from '@/hooks/api/use-procurement';
import { useWarehouses, type WarehouseCard } from '@/hooks/api/use-inventory';
import { useMaterials } from '@/hooks/api/use-materials';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { Delivery, PurchaseOrder } from '../types';
import { outstandingQuantity } from '../utils/order-rules';
import { NOT_STOCKED, receiveGoodsSchema, type ReceiveGoodsFormValues } from '../validation/delivery.schema';

export interface ReceiveGoodsRequest {
  order: PurchaseOrder;
  /** The scheduled delivery that arrived; omit for an unscheduled arrival. */
  delivery?: Delivery;
}

interface ReceiveGoodsDialogProps {
  request: ReceiveGoodsRequest | null;
  onClose: () => void;
}

/** Goods for a project usually go to that project's site store; preselect it when there's exactly one. */
function defaultStore(order: PurchaseOrder, stores: WarehouseCard[]): string {
  const siteStores = stores.filter((store) => store.projectId && store.projectId === order.project?.id);
  return siteStores.length === 1 ? siteStores[0].id : '';
}

function toFormValues(request: ReceiveGoodsRequest, stores: WarehouseCard[]): ReceiveGoodsFormValues {
  return {
    receivedAt: format(new Date(), 'yyyy-MM-dd'),
    trackingId: request.delivery?.trackingId ?? '',
    notes: '',
    warehouseId: defaultStore(request.order, stores),
    // Prefill the full outstanding quantity: most deliveries arrive complete, partials get edited down.
    lines: request.order.items.map((item) => ({
      poLineItemId: item.id,
      outstanding: outstandingQuantity(item),
      linkedMaterialId: item.material?.id ?? null,
      materialId: item.material?.id ?? NOT_STOCKED,
      quantity: outstandingQuantity(item),
    })),
  };
}

export function ReceiveGoodsDialog({ request, onClose }: ReceiveGoodsDialogProps): React.ReactElement {
  const receiveGoods = useReceiveGoods();
  const { data: storeData } = useWarehouses();
  const stores = useMemo(() => storeData ?? [], [storeData]);
  const { data: materialPage } = useMaterials({ limit: 100, sort: 'name', order: 'asc' });
  const materials = materialPage?.items ?? [];
  const { register, control, handleSubmit, reset, getValues, setValue, formState: { errors, isSubmitting } } = useForm<ReceiveGoodsFormValues>({
    resolver: zodResolver(receiveGoodsSchema),
    defaultValues: { receivedAt: '', trackingId: '', notes: '', warehouseId: '', lines: [] },
  });
  const lines = useWatch({ control, name: 'lines' }) ?? [];
  const postsToStock = lines.some((line) => Number(line?.quantity) > 0 && (line.linkedMaterialId || line.materialId !== NOT_STOCKED));

  // Reset only when a new request opens, so background refetches never wipe what the user has typed.
  useEffect(() => {
    if (request) reset(toFormValues(request, []));
  }, [request, reset]);

  // Stores load asynchronously; fill in the project's site store once known, unless one was already chosen.
  useEffect(() => {
    if (!request || getValues('warehouseId')) return;
    const store = defaultStore(request.order, stores);
    if (store) setValue('warehouseId', store);
  }, [request, stores, getValues, setValue]);

  async function onSubmit(values: ReceiveGoodsFormValues): Promise<void> {
    if (!request) return;
    try {
      const delivery = await receiveGoods.mutateAsync({
        orderId: request.order.id,
        input: {
          deliveryId: request.delivery?.id,
          warehouseId: values.warehouseId || undefined,
          receivedAt: values.receivedAt,
          trackingId: values.trackingId || undefined,
          notes: values.notes || undefined,
          items: values.lines
            .filter((line) => line.quantity > 0)
            .map((line) => ({
              poLineItemId: line.poLineItemId,
              quantity: line.quantity,
              // Only new links are sent; existing links already live on the PO line.
              materialId: !line.linkedMaterialId && line.materialId !== NOT_STOCKED ? line.materialId : undefined,
            })),
        },
      });
      toast.success(`${delivery.grnNumber ?? 'Goods receipt'} recorded`, {
        description: delivery.warehouse ? `Stock added to ${delivery.warehouse.name}.` : 'Order progress updated.',
      });
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't record the receipt. Try again."));
    }
  }

  const items = request?.order.items ?? [];

  return (
    <Dialog open={!!request} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receive Goods</DialogTitle>
          <DialogDescription>
            {request?.order.poNumber} · {request?.order.vendor?.name}. Enter what actually arrived. A GRN is generated and stocked items are added to the store.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Received on" htmlFor="grn-date" error={errors.receivedAt?.message}>
              <Input id="grn-date" type="date" max={format(new Date(), 'yyyy-MM-dd')} {...register('receivedAt')} />
            </FormField>
            <FormField label="Challan / vehicle no. (optional)" htmlFor="grn-tracking" error={errors.trackingId?.message}>
              <Input id="grn-tracking" {...register('trackingId')} />
            </FormField>
          </div>

          <div className="rounded-lg border divide-y">
            {items.map((item, index) => {
              const outstanding = outstandingQuantity(item);
              return (
                <div key={item.id} className="px-3 py-2 space-y-1.5">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.receivedQuantity} of {item.quantity} {item.unit} received · {outstanding} outstanding
                      </p>
                      {errors.lines?.[index]?.quantity?.message && (
                        <p className="text-xs text-destructive" role="alert">{errors.lines[index]?.quantity?.message}</p>
                      )}
                    </div>
                    <Input
                      aria-label={`Quantity received for ${item.description}`}
                      type="number"
                      step="any"
                      min={0}
                      max={outstanding}
                      readOnly={outstanding === 0}
                      className="w-28"
                      {...register(`lines.${index}.quantity`)}
                    />
                  </div>
                  {item.material ? (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Package className="h-3 w-3" /> Stocked as {item.material.name}
                    </p>
                  ) : outstanding > 0 && (
                    <Controller control={control} name={`lines.${index}.materialId`} render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger aria-label={`Stock ${item.description} as`} className="h-8 text-xs">
                          <Package className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NOT_STOCKED}>Don&apos;t add to stock (service, hire, one-off)</SelectItem>
                          {materials.map((material) => (
                            <SelectItem key={material.id} value={material.id}>Stock as {material.name} · {material.unit}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )} />
                  )}
                </div>
              );
            })}
          </div>
          {errors.lines?.root?.message && <p className="text-xs text-destructive" role="alert">{errors.lines.root.message}</p>}
          {errors.lines?.message && <p className="text-xs text-destructive" role="alert">{errors.lines.message}</p>}

          {postsToStock && (
            <FormField label="Add stock to" error={errors.warehouseId?.message}>
              <Controller control={control} name="warehouseId" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Receiving store"><SelectValue placeholder="Choose a store" /></SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}{store.projectName ? ` · ${store.projectName}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
          )}

          <FormField label="Notes (optional)" htmlFor="grn-notes" error={errors.notes?.message}>
            <Textarea id="grn-notes" rows={2} placeholder="Damages, shortages, quality remarks" {...register('notes')} />
          </FormField>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Recording…' : 'Record Receipt'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
