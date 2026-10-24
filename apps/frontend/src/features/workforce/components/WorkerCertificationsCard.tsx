'use client';

import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { AlertTriangle, Award, CheckCircle2, MoreHorizontal, Pencil, Plus, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@sitepilot/ui';
import { Can } from '@/components/shared/Can';
import { useCan } from '@/hooks/api/use-access';
import { useRemoveCertification, type CertStatus, type Certification, type Worker } from '@/hooks/api/use-workforce';
import { getApiErrorMessage } from '@/lib/api/errors';
import { CertificationFormDialog } from './CertificationFormDialog';

const STATUS_STYLES: Record<CertStatus, { label: string; bar: string; text: string; icon: React.ReactNode }> = {
  valid: { label: 'Valid', bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> },
  expiring: { label: 'Expiring', bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> },
  expired: { label: 'Expired', bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400', icon: <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> },
};

/** "Expires in 12 days", "Expired 3 days ago", "No expiry". */
export function describeExpiry(certification: Certification): string {
  const days = certification.daysToExpiry;
  if (days === null || !certification.expiresOn) return 'No expiry';
  if (days === 0) return 'Expires today';
  if (days < 0) return `Expired ${-days} day${days === -1 ? '' : 's'} ago`;
  if (days <= 60) return `Expires in ${days} day${days === 1 ? '' : 's'}`;
  return `Expires ${format(parseISO(certification.expiresOn), 'd MMM yyyy')}`;
}

export function WorkerCertificationsCard({ worker }: { worker: Worker }): React.ReactElement {
  const can = useCan();
  const removeCertification = useRemoveCertification(worker.id);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Certification | undefined>(undefined);
  const [removing, setRemoving] = useState<Certification | null>(null);

  function openForm(certification?: Certification): void {
    setEditing(certification);
    setFormOpen(true);
  }

  async function confirmRemove(): Promise<void> {
    if (!removing) return;
    try {
      await removeCertification.mutateAsync(removing.id);
      toast.success(`${removing.name} removed`);
      setRemoving(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't remove the certificate. Try again."));
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold">
          <Award className="h-4 w-4 text-muted-foreground" /> Certifications
        </h4>
        <div className="flex items-center gap-2">
          {worker.ppeCompliant ? (
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" /> PPE OK
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
              <ShieldAlert className="h-3.5 w-3.5" /> PPE Flag
            </span>
          )}
          <Can permission="workforce.manage">
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => openForm()}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add
            </Button>
          </Can>
        </div>
      </div>

      {worker.certifications.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No certificates on file.{can('workforce.manage') ? ' Add safety induction, medical fitness or licences to track their expiry.' : ''}
        </p>
      ) : (
        <ul className="space-y-2">
          {worker.certifications.map((certification) => {
            const style = STATUS_STYLES[certification.status];
            return (
              <li key={certification.id} className="flex items-center gap-3 rounded-lg bg-muted/40 p-2.5">
                <div className={`w-1 self-stretch rounded-full ${style.bar}`} aria-hidden="true" />
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {style.icon}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{certification.name}</p>
                    {(certification.issuer || certification.certificateNumber) && (
                      <p className="truncate text-[10px] text-muted-foreground">
                        {[certification.issuer, certification.certificateNumber && `No. ${certification.certificateNumber}`].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-[10px] font-semibold ${style.text}`}>{style.label.toUpperCase()}</p>
                  <p className="text-[10px] text-muted-foreground">{describeExpiry(certification)}</p>
                </div>
                <Can permission="workforce.manage">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label={`Actions for ${certification.name}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => openForm(certification)}><Pencil className="mr-2 h-4 w-4" /> Edit or renew</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setRemoving(certification)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Can>
              </li>
            );
          })}
        </ul>
      )}

      <CertificationFormDialog worker={worker} certification={editing} open={formOpen} onOpenChange={setFormOpen} />

      <Dialog open={removing !== null} onOpenChange={(open) => { if (!open) setRemoving(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Remove certificate?</DialogTitle>
            <DialogDescription>
              {removing?.name} will no longer be on {worker.name}&apos;s record. To renew it instead, edit its dates.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRemoving(null)}>Keep it</Button>
            <Button variant="destructive" onClick={() => { void confirmRemove(); }} disabled={removeCertification.isPending}>
              {removeCertification.isPending ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
