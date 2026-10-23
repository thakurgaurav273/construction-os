'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button, Input } from '@sitepilot/ui';
import { Check, Layers, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useRemoveLocation, useSaveLocation, type WarehouseDetail } from '@/hooks/api/use-inventory';
import { getApiErrorMessage } from '@/lib/api/errors';
import { locationSchema, toLocationInput, type LocationFormValues } from '../validation/warehouse.schema';

type Location = WarehouseDetail['locations'][number];

interface LocationFormProps {
  warehouseId: string;
  location?: Location;
  onDone: () => void;
}

/** Inline add/edit row: bins are small records, so a dialog would be heavier than the edit itself. */
function LocationForm({ warehouseId, location, onDone }: LocationFormProps): React.ReactElement {
  const saveLocation = useSaveLocation();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: { code: location?.code ?? '', name: location?.name ?? '', zone: location?.zone ?? '' },
  });
  const firstError = errors.code?.message ?? errors.name?.message ?? errors.zone?.message;

  async function onSubmit(values: LocationFormValues): Promise<void> {
    try {
      await saveLocation.mutateAsync({ warehouseId, locationId: location?.id, input: toLocationInput(values) });
      toast.success(location ? `Bin ${values.code.toUpperCase()} updated` : `Bin ${values.code.toUpperCase()} added`);
      onDone();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save the bin. Try again."));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-1 py-1.5" noValidate>
      <div className="flex items-center gap-2">
        <Input aria-label="Bin code" placeholder="A-01" className="h-8 w-20 uppercase" autoFocus {...register('code')} />
        <Input aria-label="Bin name" placeholder="Cement bay" className="h-8 flex-1 min-w-0" {...register('name')} />
        <Input aria-label="Zone" placeholder="Zone" className="h-8 w-20" {...register('zone')} />
        <Button type="submit" size="icon" className="h-8 w-8 shrink-0" aria-label="Save bin" disabled={isSubmitting}>
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Cancel" onClick={onDone}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {firstError && <p className="text-xs text-destructive" role="alert">{firstError}</p>}
    </form>
  );
}

export function WarehouseLocationsCard({ warehouse, canManage }: { warehouse: WarehouseDetail; canManage: boolean }): React.ReactElement | null {
  const removeLocation = useRemoveLocation();
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);

  if (warehouse.locations.length === 0 && !canManage) return null;

  async function handleRemove(location: Location): Promise<void> {
    try {
      await removeLocation.mutateAsync({ warehouseId: warehouse.id, locationId: location.id });
      toast.success(`Bin ${location.code} removed`, { description: 'Items in it keep their stock.' });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't remove the bin. Try again."));
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-muted-foreground" /> Bin Locations
        </h4>
        {canManage && editingId === null && (
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setEditingId('new')}>
            <Plus className="h-3.5 w-3.5" /> Add bin
          </Button>
        )}
      </div>

      {warehouse.locations.length === 0 && editingId !== 'new' && (
        <p className="text-xs text-muted-foreground">No bins yet. Add bins to record where each material sits in the store.</p>
      )}

      <div className="divide-y divide-dashed">
        {warehouse.locations.map((location) => (
          editingId === location.id ? (
            <LocationForm key={location.id} warehouseId={warehouse.id} location={location} onDone={() => setEditingId(null)} />
          ) : (
            <div key={location.id} className="flex items-center gap-2 py-1.5">
              <span className="w-16 shrink-0 font-mono text-xs font-semibold">{location.code}</span>
              <span className="flex-1 min-w-0 truncate text-sm">{location.name}</span>
              {location.zone && <span className="text-xs text-muted-foreground shrink-0">{location.zone}</span>}
              {canManage && (
                <>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label={`Edit bin ${location.code}`} onClick={() => setEditingId(location.id)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove bin ${location.code}`}
                    disabled={removeLocation.isPending}
                    onClick={() => handleRemove(location)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          )
        ))}
        {editingId === 'new' && <LocationForm warehouseId={warehouse.id} onDone={() => setEditingId(null)} />}
      </div>
    </div>
  );
}
