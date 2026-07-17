'use client';

import { Warehouse } from 'lucide-react';
import { ComingSoonPage } from '@/components/layout/ComingSoonPage';

export default function InventoryPage() {
  return (
    <ComingSoonPage
      icon={Warehouse}
      iconBg="bg-violet-500/10"
      iconColor="text-violet-500"
      title="Inventory"
      description="Warehouse and site inventory management — know exactly what you have, where it is, and when to reorder."
      capabilities={[
        'Multi-warehouse stock management',
        'Bin and location tracking',
        'Inter-site transfer orders',
        'Low stock and expiry alerts',
        'Inventory valuation (FIFO / AVCO)',
        'Full audit trail and stock reconciliation',
      ]}
    />
  );
}
