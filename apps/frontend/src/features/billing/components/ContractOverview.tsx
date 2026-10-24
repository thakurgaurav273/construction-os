import React from 'react';
import { Card, CardContent } from '@sitepilot/ui';
import { DIRECTION_LABELS } from '../constants';
import type { ContractDetail } from '../types';
import { describeAdjustment, formatAmount } from '../utils/format';

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }): React.ReactElement {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-lg font-semibold">{value}</p>
      {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Key figures and the contract's standing taxes and deductions. */
export function ContractOverview({ contract }: { contract: ContractDetail }): React.ReactElement {
  const certifiedPercent = contract.contractValue > 0 ? Math.round((contract.certifiedToDate / contract.contractValue) * 100) : 0;
  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label={DIRECTION_LABELS[contract.direction].party} value={contract.party?.name ?? '—'} hint={contract.reference ? `WO/PO ${contract.reference}` : undefined} />
          <Stat label="Contract value" value={formatAmount(contract.contractValue)} hint={`${contract.itemCount} BOQ lines`} />
          <Stat label="Certified to date (gross)" value={formatAmount(contract.certifiedToDate)} hint={`${certifiedPercent}% of contract value`} />
          <Stat label="Bills" value={String(contract.billCount)} hint={`${contract.openBill ? `${contract.openBill.code} open` : 'None open'} · due in ${contract.paymentTermDays} days`} />
        </div>
        {contract.materials && contract.materials.issuedValue > 0 && (
          <div className="grid grid-cols-3 gap-4 rounded-lg bg-muted/40 px-4 py-3">
            <Stat label="Material issued to them" value={formatAmount(contract.materials.issuedValue)} />
            <Stat label="Recovered on certified bills" value={formatAmount(contract.materials.recoveredValue)} />
            <Stat label="Still to recover" value={formatAmount(contract.materials.pendingValue)} hint={contract.materials.pendingValue > 0 ? 'Recover it on the next bill' : undefined} />
          </div>
        )}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Taxes & deductions on each bill</p>
          {contract.adjustments.length === 0 ? (
            <p className="text-sm text-muted-foreground">None. Bills pay the gross amount.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {contract.adjustments.map((rule) => (
                <li key={rule.id} className="rounded-md border px-2.5 py-1 text-xs">
                  <span className={rule.effect === 'ADD' ? 'text-emerald-600' : 'text-destructive'}>{rule.effect === 'ADD' ? '+' : '−'}</span>{' '}
                  {rule.label} <span className="text-muted-foreground">· {rule.calculation === 'FIXED' ? formatAmount(rule.value) : describeAdjustment(rule)}{rule.isRetention && ' · retention'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
