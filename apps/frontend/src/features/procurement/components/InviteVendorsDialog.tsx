'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@sitepilot/ui';
import { useInviteVendors, useVendors } from '@/hooks/api/use-procurement';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { RfqDetail } from '../types';
import { VendorChecklist } from './VendorChecklist';

interface InviteVendorsDialogProps {
  rfq: RfqDetail | null;
  onClose: () => void;
}

export function InviteVendorsDialog({ rfq, onClose }: InviteVendorsDialogProps): React.ReactElement {
  const { data: vendors = [] } = useVendors();
  const inviteVendors = useInviteVendors();
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (rfq) setSelected([]);
  }, [rfq]);

  const invitedIds = rfq?.invitations.map((invitation) => invitation.vendor.id) ?? [];

  async function handleInvite(): Promise<void> {
    if (!rfq) return;
    try {
      await inviteVendors.mutateAsync({ id: rfq.id, vendorIds: selected });
      toast.success(`${selected.length} vendor${selected.length === 1 ? '' : 's'} invited to ${rfq.rfqNumber}`);
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't invite the vendors. Try again."));
    }
  }

  return (
    <Dialog open={!!rfq} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Invite Vendors</DialogTitle>
          <DialogDescription>Add more suppliers to {rfq?.rfqNumber} while it&apos;s open for quotes.</DialogDescription>
        </DialogHeader>
        <VendorChecklist
          vendors={vendors}
          value={selected}
          onChange={setSelected}
          category={rfq?.category}
          lockedIds={invitedIds}
        />
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={inviteVendors.isPending}>Cancel</Button>
          <Button onClick={handleInvite} disabled={selected.length === 0 || inviteVendors.isPending}>
            {inviteVendors.isPending ? 'Inviting…' : `Invite ${selected.length || ''}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
