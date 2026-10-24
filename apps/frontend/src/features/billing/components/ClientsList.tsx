'use client';

import React, { useState } from 'react';
import { Button, Skeleton } from '@sitepilot/ui';
import { AlertTriangle, Building, Pencil } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useClients } from '@/hooks/api/use-billing';
import type { Client } from '../types';
import { ClientFormDialog } from './ClientFormDialog';

export function ClientsList({ canManage }: { canManage: boolean }): React.ReactElement {
  const { data: clients = [], isLoading, isError, refetch } = useClients();
  const [editing, setEditing] = useState<Client | 'new' | null>(null);

  return (
    <div className="space-y-4">
      {canManage && clients.length > 0 && (
        <div className="flex justify-end"><Button variant="outline" onClick={() => setEditing('new')}>New Client</Button></div>
      )}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-16 w-full rounded-lg" />)}</div>
      ) : isError ? (
        <EmptyState icon={AlertTriangle} title="Unable to load clients" description="Check your connection and try again." action={<Button onClick={() => refetch()}>Retry</Button>} />
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Building}
          title="No clients yet"
          description="Clients are the owners and main contractors you bill. Subcontractors are vendors, managed in Procurement."
          action={canManage ? <Button onClick={() => setEditing('new')}>New Client</Button> : undefined}
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {clients.map((client) => (
            <li key={client.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{client.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[client.contactPerson, client.email, client.gstNumber && `GSTIN ${client.gstNumber}`].filter(Boolean).join(' · ') || 'No contact details'}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{client.contractCount} {client.contractCount === 1 ? 'contract' : 'contracts'}</span>
              {canManage && (
                <Button variant="ghost" size="icon" aria-label={`Edit ${client.name}`} onClick={() => setEditing(client)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <ClientFormDialog
        open={editing !== null}
        onOpenChange={(open) => { if (!open) setEditing(null); }}
        client={editing && editing !== 'new' ? editing : undefined}
      />
    </div>
  );
}
