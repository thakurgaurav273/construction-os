'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Textarea,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { useProjects } from '@/hooks/api/use-projects';
import { useInventoryItems, useWarehouses } from '@/hooks/api/use-inventory';
import {
  useMaterials, useProjectMaterials, useRecordSiteStockMovement, type SiteStockMovementType,
} from '@/hooks/api/use-materials';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatNumber } from '@/lib/utils';
import { NO_SUBCONTRACT, siteStockSchema, toSiteStockInput, type SiteStockFormValues } from '../validation/site-stock.schema';
import { SubcontractRecoveryFields } from './SubcontractRecoveryFields';

interface SiteStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: SiteStockMovementType;
  /** Fixes the project, e.g. when opened from a project's Materials tab. */
  projectId?: string;
  /** Fixes the material, e.g. when opened from the material drawer. */
  materialId?: string;
}

interface StoreOption {
  id: string;
  label: string;
  available: number;
  isSiteStore: boolean;
}

const COPY: Record<SiteStockMovementType, { title: string; description: string; submit: string; storeLabel: string }> = {
  ISSUE: {
    title: 'Issue Material',
    description: 'Send stock from a store to a project site. It is charged to the project as consumed.',
    submit: 'Issue Material',
    storeLabel: 'Issue from store',
  },
  RETURN: {
    title: 'Return to Store',
    description: 'Record unused material coming back from site. It is credited back to the project.',
    submit: 'Record Return',
    storeLabel: 'Return to store',
  },
};

function emptyValues(projectId = '', materialId = ''): SiteStockFormValues {
  return {
    projectId, materialId, warehouseId: '', quantity: 0, issuedOn: format(new Date(), 'yyyy-MM-dd'), note: '', contractId: NO_SUBCONTRACT, recoveryRate: '',
  };
}

export function SiteStockDialog({ open, onOpenChange, type, projectId, materialId }: SiteStockDialogProps): React.ReactElement {
  const copy = COPY[type];
  const recordMovement = useRecordSiteStockMovement();
  const { register, control, handleSubmit, reset, setValue, getValues, formState: { errors, isSubmitting } } = useForm<SiteStockFormValues>({
    resolver: zodResolver(siteStockSchema),
    defaultValues: emptyValues(projectId, materialId),
  });
  const selectedProjectId = useWatch({ control, name: 'projectId' });
  const selectedMaterialId = useWatch({ control, name: 'materialId' });
  const selectedWarehouseId = useWatch({ control, name: 'warehouseId' });
  const selectedContractId = useWatch({ control, name: 'contractId' });

  const { data: projects = [] } = useProjects();
  const { data: materials } = useMaterials({ limit: 100, sort: 'name', order: 'asc' });
  const { data: warehouses = [] } = useWarehouses();
  const { data: storeStock } = useInventoryItems(
    { materialId: selectedMaterialId, limit: 100 },
    { enabled: type === 'ISSUE' && !!selectedMaterialId },
  );
  const { data: projectMaterials } = useProjectMaterials(selectedProjectId);

  const issuedToProject = projectMaterials?.items.find((item) => item.materialId === selectedMaterialId)?.consumed ?? 0;
  const material = materials?.items.find((item) => item.id === selectedMaterialId);

  // Returns only make sense for material the project has actually received.
  const materialOptions = useMemo(() => {
    const all = materials?.items ?? [];
    if (type === 'ISSUE' || !projectMaterials) return all;
    const returnable = new Set(projectMaterials.items.filter((item) => item.consumed > 0).map((item) => item.materialId));
    return all.filter((item) => returnable.has(item.id));
  }, [materials, projectMaterials, type]);

  const storeOptions = useMemo((): StoreOption[] => {
    if (type === 'RETURN') {
      return warehouses.map((store) => ({
        id: store.id, label: store.name, available: 0, isSiteStore: store.projectId === selectedProjectId,
      }));
    }
    if (!selectedMaterialId) return [];
    return (storeStock?.items ?? [])
      .filter((item) => item.available > 0)
      .map((item) => ({
        id: item.warehouseId,
        label: `${item.warehouseName} · ${formatNumber(item.available)} ${item.unit} available`,
        available: item.available,
        isSiteStore: item.projectId === selectedProjectId,
      }));
  }, [type, warehouses, storeStock, selectedMaterialId, selectedProjectId]);

  // Prefer the project's own site store, then whichever store has the most stock.
  useEffect(() => {
    if (storeOptions.some((store) => store.id === getValues('warehouseId'))) return;
    const preferred = storeOptions.find((store) => store.isSiteStore)
      ?? [...storeOptions].sort((a, b) => b.available - a.available)[0];
    setValue('warehouseId', type === 'RETURN' && !preferred?.isSiteStore ? '' : preferred?.id ?? '');
  }, [storeOptions, type, getValues, setValue]);

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) reset(emptyValues(projectId, materialId));
    wasOpen.current = open;
  }, [open, projectId, materialId, reset]);

  async function onSubmit(values: SiteStockFormValues): Promise<void> {
    try {
      const saved = await recordMovement.mutateAsync({ projectId: values.projectId, type, input: toSiteStockInput(values) });
      toast.success(`${saved.code} recorded`, {
        description: `${formatNumber(saved.quantity)} ${saved.material.unit} of ${saved.material.name} · ${saved.warehouse.name}`,
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't record the movement. Try again."));
    }
  }

  const selectedStore = storeOptions.find((store) => store.id === selectedWarehouseId);
  const quantityHint = type === 'ISSUE'
    ? selectedStore && material && `${formatNumber(selectedStore.available)} ${material.unit} available at this store`
    : material && selectedProjectId && `${formatNumber(issuedToProject)} ${material.unit} issued to this project so far`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {!projectId && (
            <FormField label="Project" error={errors.projectId?.message}>
              <Controller control={control} name="projectId" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Project"><SelectValue placeholder="Choose a project" /></SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
          )}

          {!materialId && (
            <FormField label="Material" error={errors.materialId?.message}>
              <Controller control={control} name="materialId" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Material"><SelectValue placeholder="Choose a material" /></SelectTrigger>
                  <SelectContent>
                    {materialOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>{option.name} · {option.unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
          )}

          <FormField
            label={copy.storeLabel}
            error={errors.warehouseId?.message}
            hint={type === 'ISSUE' && selectedMaterialId && storeOptions.length === 0 ? 'No store has this material in stock.' : undefined}
          >
            <Controller control={control} name="warehouseId" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={storeOptions.length === 0}>
                <SelectTrigger aria-label={copy.storeLabel}><SelectValue placeholder="Choose a store" /></SelectTrigger>
                <SelectContent>
                  {storeOptions.map((store) => (
                    <SelectItem key={store.id} value={store.id}>{store.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label={material ? `Quantity (${material.unit})` : 'Quantity'}
              htmlFor="site-stock-quantity"
              error={errors.quantity?.message}
              hint={quantityHint || undefined}
            >
              <Input id="site-stock-quantity" type="number" step="any" min={0} {...register('quantity')} />
            </FormField>
            <FormField label="Date" htmlFor="site-stock-date" error={errors.issuedOn?.message}>
              <Input id="site-stock-date" type="date" max={format(new Date(), 'yyyy-MM-dd')} {...register('issuedOn')} />
            </FormField>
          </div>

          <SubcontractRecoveryFields
            type={type}
            projectId={selectedProjectId}
            selectedContractId={selectedContractId}
            defaultRate={material?.unitCost ?? null}
            control={control}
            register={register}
            errors={errors}
          />

          <FormField label="Note (optional)" htmlFor="site-stock-note" error={errors.note?.message}>
            <Textarea
              id="site-stock-note"
              rows={2}
              placeholder={type === 'ISSUE' ? 'e.g. Slab casting, 3rd floor' : 'e.g. Surplus after plastering'}
              {...register('note')}
            />
          </FormField>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : copy.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
