'use client';

import React from 'react';
import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { useCan } from '@/hooks/api/use-access';
import { useContracts } from '@/hooks/api/use-billing';
import type { SiteStockMovementType } from '@/hooks/api/use-materials';
import { NO_SUBCONTRACT, type SiteStockFormValues } from '../validation/site-stock.schema';

interface SubcontractRecoveryFieldsProps {
  type: SiteStockMovementType;
  projectId: string;
  selectedContractId: string;
  defaultRate: number | null;
  control: Control<SiteStockFormValues>;
  register: UseFormRegister<SiteStockFormValues>;
  errors: FieldErrors<SiteStockFormValues>;
}

/**
 * Who the material is for: the project itself, or a subcontractor it is recovered from on their RA bills.
 * Hidden for people who can't see billing and on projects with no active subcontract.
 */
export function SubcontractRecoveryFields({
  type, projectId, selectedContractId, defaultRate, control, register, errors,
}: SubcontractRecoveryFieldsProps): React.ReactElement | null {
  const canSeeBilling = useCan()('billing.view');
  const { data: contracts = [] } = useContracts({ projectId: projectId || undefined, direction: 'SUBCONTRACT', status: 'ACTIVE' }, canSeeBilling && !!projectId);
  if (!canSeeBilling || !projectId || contracts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField
        label={type === 'ISSUE' ? 'Issued to' : 'Returned by'}
        hint={selectedContractId !== NO_SUBCONTRACT ? 'Recovered from their next RA bill.' : undefined}
      >
        <Controller control={control} name="contractId" render={({ field }) => (
          <Select value={field.value} onValueChange={(value) => { if (value) field.onChange(value); }}>
            <SelectTrigger aria-label={type === 'ISSUE' ? 'Issued to' : 'Returned by'}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_SUBCONTRACT}>Our own site use</SelectItem>
              {contracts.map((contract) => (
                <SelectItem key={contract.id} value={contract.id}>{contract.party?.name ?? contract.code} · {contract.code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )} />
      </FormField>
      {selectedContractId !== NO_SUBCONTRACT && (
        <FormField
          label="Recovery rate (₹ per unit)"
          htmlFor="site-stock-recovery-rate"
          error={errors.recoveryRate?.message}
          hint={defaultRate !== null ? `Blank uses the stock cost, ₹${defaultRate}.` : undefined}
        >
          <Input id="site-stock-recovery-rate" type="number" step="0.01" min={0} {...register('recoveryRate')} />
        </FormField>
      )}
    </div>
  );
}
