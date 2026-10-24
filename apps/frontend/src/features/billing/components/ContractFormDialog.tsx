'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Textarea,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cn,
} from '@sitepilot/ui';
import { Plus } from 'lucide-react';
import { FormField } from '@/components/shared/FormField';
import { useCan } from '@/hooks/api/use-access';
import { useClients, useCreateContract, useUpdateContract } from '@/hooks/api/use-billing';
import { useVendors } from '@/hooks/api/use-procurement';
import { useProjects } from '@/hooks/api/use-projects';
import { getApiErrorMessage } from '@/lib/api/errors';
import { DIRECTION_LABELS } from '../constants';
import type { ContractDetail, ContractDirection } from '../types';
import { contractSchema, toContractFormValues, toContractInput, type ContractFormValues } from '../validation/contract.schema';
import { AdjustmentRulesEditor } from './AdjustmentRulesEditor';
import { ClientFormDialog } from './ClientFormDialog';

interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Omit to create a new contract. */
  contract?: ContractDetail;
  defaultDirection?: ContractDirection;
  onSaved?: (contract: ContractDetail) => void;
}

const DIRECTIONS: ContractDirection[] = ['CLIENT', 'SUBCONTRACT'];

export function ContractFormDialog({ open, onOpenChange, contract, defaultDirection, onSaved }: ContractFormDialogProps): React.ReactElement {
  const canManageVendors = useCan()('vendor.manage');
  const { data: projects = [] } = useProjects();
  const { data: clients = [] } = useClients(open);
  const { data: vendors = [] } = useVendors();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const [clientDialogOpen, setClientDialogOpen] = useState(false);

  const { register, control, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: toContractFormValues(contract, { direction: defaultDirection }),
  });
  const direction = useWatch({ control, name: 'direction' });
  const parties = direction === 'CLIENT'
    ? clients.map((client) => ({ id: client.id, name: client.name }))
    : vendors.filter((vendor) => vendor.status === 'ACTIVE' || vendor.id === contract?.party?.id).map((vendor) => ({ id: vendor.id, name: vendor.name }));

  // Reset only as the dialog opens, so background refetches never wipe edits.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) reset(toContractFormValues(contract, { direction: defaultDirection }));
    wasOpen.current = open;
  }, [open, contract, defaultDirection, reset]);

  async function onSubmit(values: ContractFormValues): Promise<void> {
    const { direction: _direction, projectId: _projectId, ...changes } = toContractInput(values);
    try {
      const saved = contract
        ? await updateContract.mutateAsync({ id: contract.id, input: changes })
        : await createContract.mutateAsync(toContractInput(values));
      toast.success(contract ? `${saved.code} updated` : `${saved.code} created`, {
        description: contract ? undefined : 'Add the BOQ next, then start the first RA bill.',
      });
      onOpenChange(false);
      onSaved?.(saved);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save the contract. Try again."));
    }
  }

  const partyLabel = DIRECTION_LABELS[direction].party;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contract ? `Edit ${contract.code}` : 'New Contract'}</DialogTitle>
          <DialogDescription>A work order or PO with an agreed BOQ, billed in running account bills.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {!contract && (
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Contract type">
              {DIRECTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={direction === option}
                  onClick={() => { setValue('direction', option); setValue('partyId', ''); }}
                  className={cn(
                    'rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    direction === option ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                  )}
                >
                  <p className="text-sm font-medium">{DIRECTION_LABELS[option].label}</p>
                  <p className="text-xs text-muted-foreground">{DIRECTION_LABELS[option].description}</p>
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Project" error={errors.projectId?.message}>
              <Controller control={control} name="projectId" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!!contract}>
                  <SelectTrigger aria-label="Project"><SelectValue placeholder="Select a project" /></SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
            <FormField
              label={partyLabel}
              error={errors.partyId?.message}
              hint={direction === 'SUBCONTRACT' && parties.length === 0 ? `Add the subcontractor as a vendor in Procurement first${canManageVendors ? '' : ' (ask procurement)'}.` : undefined}
            >
              <div className="flex gap-2">
                <Controller control={control} name="partyId" render={({ field }) => (
                  <Select value={field.value} onValueChange={(value) => { if (value) field.onChange(value); }}>
                    <SelectTrigger aria-label={partyLabel}><SelectValue placeholder={`Select the ${partyLabel.toLowerCase()}`} /></SelectTrigger>
                    <SelectContent>
                      {parties.map((party) => <SelectItem key={party.id} value={party.id}>{party.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
                {direction === 'CLIENT' && (
                  <Button type="button" variant="outline" size="icon" aria-label="Add a client" onClick={() => setClientDialogOpen(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </FormField>
            <FormField label="Name of work" htmlFor="contract-title" error={errors.title?.message} className="sm:col-span-2">
              <Input id="contract-title" placeholder="Construction of new road and gate" {...register('title')} />
            </FormField>
            <FormField label="Their WO / PO number (optional)" htmlFor="contract-reference" error={errors.reference?.message}>
              <Input id="contract-reference" placeholder="5500044952-025-1041" {...register('reference')} />
            </FormField>
            <FormField label="Payment terms (days)" htmlFor="contract-terms" error={errors.paymentTermDays?.message} hint="Certified bills fall due this many days later.">
              <Input id="contract-terms" type="number" min={0} max={365} step={1} {...register('paymentTermDays')} />
            </FormField>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Start (optional)" htmlFor="contract-start" error={errors.startDate?.message}>
                <Input id="contract-start" type="date" {...register('startDate')} />
              </FormField>
              <FormField label="End (optional)" htmlFor="contract-end" error={errors.endDate?.message}>
                <Input id="contract-end" type="date" {...register('endDate')} />
              </FormField>
            </div>
          </div>

          <AdjustmentRulesEditor control={control} register={register} errors={errors} />

          <FormField label="Notes (optional)" htmlFor="contract-notes" error={errors.notes?.message}>
            <Textarea id="contract-notes" rows={2} {...register('notes')} />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : contract ? 'Save Changes' : 'Create Contract'}</Button>
          </DialogFooter>
        </form>

        <ClientFormDialog
          open={clientDialogOpen}
          onOpenChange={setClientDialogOpen}
          onSaved={(client) => setValue('partyId', client.id, { shouldValidate: true })}
        />
      </DialogContent>
    </Dialog>
  );
}
