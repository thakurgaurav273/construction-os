'use client';

import { Package } from 'lucide-react';
import { ComingSoonPage } from '@/components/layout/ComingSoonPage';

export default function MaterialsPage() {
  return (
    <ComingSoonPage
      icon={Package}
      iconBg="bg-amber-500/10"
      iconColor="text-amber-500"
      title="Materials"
      description="Centralised material management across all projects — track stock, deliveries, and consumption in real time."
      capabilities={[
        'Organisation-wide material catalogue',
        'Real-time stock levels and reorder alerts',
        'Delivery tracking and scheduling',
        'Cross-project consumption analytics',
        'Vendor and supplier linkage',
        'Material cost trend reporting',
      ]}
    />
  );
}
