'use client';

import React, { useState } from 'react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Progress } from '@sitepilot/ui';
import { ListChecks, Pencil } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import type { ContractDetail } from '../types';
import { formatAmount, formatQuantity } from '../utils/format';
import { BoqEditor } from './BoqEditor';

interface ContractBoqCardProps {
  contract: ContractDetail;
  canEdit: boolean;
}

/** The BOQ with how much of each line has been certified so far. */
export function ContractBoqCard({ contract, canEdit }: ContractBoqCardProps): React.ReactElement {
  const [editing, setEditing] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Bill of Quantities</CardTitle>
          <CardDescription>
            {contract.items.length} {contract.items.length === 1 ? 'line' : 'lines'} · {formatAmount(contract.contractValue)}
          </CardDescription>
        </div>
        {canEdit && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="mr-1 h-3.5 w-3.5" /> {contract.items.length === 0 ? 'Add BOQ' : 'Edit BOQ'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <BoqEditor contract={contract} onDone={() => setEditing(false)} />
        ) : contract.items.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No BOQ yet"
            description="Add the contract's items with their units, quantities and rates. Bills are measured against them."
            action={canEdit ? <Button onClick={() => setEditing(true)}>Add BOQ</Button> : undefined}
          />
        ) : (
          <ul className="divide-y rounded-xl border">
            {contract.items.map((item) => {
              const progress = item.quantity > 0 ? Math.min(100, (item.certifiedQuantity / item.quantity) * 100) : 0;
              return (
                <li key={item.id} className="grid gap-2 px-4 py-3 md:grid-cols-[80px_minmax(0,1fr)_200px_200px] md:items-center">
                  <div className="text-sm font-medium">
                    {item.itemNo}
                    {item.rateCode && <p className="text-xs font-normal text-muted-foreground">{item.rateCode}</p>}
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm">{item.description}</p>
                    {item.isExtra && <Badge variant="outline" className="mt-1">Extra item</Badge>}
                  </div>
                  <div className="text-sm md:text-right">
                    <p>{formatQuantity(item.quantity)} {item.unit} × {formatAmount(item.rate)}</p>
                    <p className="text-xs text-muted-foreground">{formatAmount(item.amount)}</p>
                  </div>
                  <div className="space-y-1">
                    <Progress value={progress} aria-label={`Item ${item.itemNo} certified`} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">
                      {formatQuantity(item.certifiedQuantity)} {item.unit} certified ({Math.round(progress)}%)
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
