'use client';

import React, { useEffect, useRef } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Button, Input, Label, Textarea,
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { Plus, Trash2 } from 'lucide-react';
import { FormField } from '@/components/shared/FormField';
import { useMaterials } from '@/hooks/api/use-materials';
import { useCreateMaterialRequest } from '@/hooks/api/use-material-requests';
import { useProjects } from '@/hooks/api/use-projects';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatNumber } from '@/lib/utils';
import {
  materialRequestSchema, toMaterialRequestInput, type MaterialRequestFormValues,
} from '../validation/material-request.schema';

interface MaterialRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fixes the project, e.g. when opened from a project's Materials tab. */
  projectId?: string;
  /** Opens the new request once it's raised. */
  onCreated?: (requestId: string) => void;
}

const EMPTY_LINE = { materialId: '', quantity: 0 };

function emptyValues(projectId = ''): MaterialRequestFormValues {
  return { projectId, neededBy: '', note: '', items: [EMPTY_LINE] };
}

export function MaterialRequestDialog({ open, onOpenChange, projectId, onCreated }: MaterialRequestDialogProps): React.ReactElement {
  const createRequest = useCreateMaterialRequest();
  const { data: projects = [] } = useProjects();
  const { data: materials } = useMaterials({ limit: 100, sort: 'name', order: 'asc' });
  const materialOptions = materials?.items ?? [];

  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MaterialRequestFormValues>({
    resolver: zodResolver(materialRequestSchema),
    defaultValues: emptyValues(projectId),
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = useWatch({ control, name: 'items' });

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) reset(emptyValues(projectId));
    wasOpen.current = open;
  }, [open, projectId, reset]);

  async function onSubmit(values: MaterialRequestFormValues): Promise<void> {
    try {
      const request = await createRequest.mutateAsync(toMaterialRequestInput(values));
      toast.success(`${request.code} raised`, { description: 'The stores will review it and issue the material.' });
      onOpenChange(false);
      onCreated?.(request.id);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't raise the request. Try again."));
    }
  }

  const linesError = errors.items?.root?.message ?? errors.items?.message;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Material</DialogTitle>
          <DialogDescription>
            Ask the stores for material this site needs. Someone else approves it, then the stores issue it.
          </DialogDescription>
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

          <div className="space-y-2">
            <Label>Materials</Label>
            {fields.map((field, index) => {
              const material = materialOptions.find((option) => option.id === items?.[index]?.materialId);
              const lineErrors = errors.items?.[index];
              return (
                <div key={field.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <Controller control={control} name={`items.${index}.materialId`} render={({ field: select }) => (
                        <Select value={select.value} onValueChange={select.onChange}>
                          <SelectTrigger aria-label={`Material ${index + 1}`}><SelectValue placeholder="Choose material" /></SelectTrigger>
                          <SelectContent>
                            {materialOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>{option.name} · {option.unit}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )} />
                    </div>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      placeholder="Qty"
                      aria-label={`Quantity ${index + 1}`}
                      className="w-24"
                      {...register(`items.${index}.quantity`)}
                    />
                    <span className="text-xs text-muted-foreground w-10 shrink-0">{material?.unit ?? ''}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      aria-label={`Remove material ${index + 1}`}
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {lineErrors?.materialId || lineErrors?.quantity ? (
                    <p className="text-xs text-destructive" role="alert">
                      {lineErrors.materialId?.message ?? lineErrors.quantity?.message}
                    </p>
                  ) : material && (
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(material.available)} {material.unit} available across stores
                    </p>
                  )}
                </div>
              );
            })}
            {linesError && <p className="text-xs text-destructive" role="alert">{linesError}</p>}
            <Button type="button" variant="outline" size="sm" onClick={() => append(EMPTY_LINE)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add material
            </Button>
          </div>

          <FormField label="Needed by (optional)" htmlFor="material-request-needed-by" error={errors.neededBy?.message}>
            <Input id="material-request-needed-by" type="date" min={format(new Date(), 'yyyy-MM-dd')} {...register('neededBy')} />
          </FormField>

          <FormField label="What is it for? (optional)" htmlFor="material-request-note" error={errors.note?.message}>
            <Textarea id="material-request-note" rows={2} placeholder="e.g. Slab casting, 3rd floor" {...register('note')} />
          </FormField>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Requesting…' : 'Request Material'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
