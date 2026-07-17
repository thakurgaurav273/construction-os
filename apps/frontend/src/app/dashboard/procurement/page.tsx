'use client';

import { ShoppingCart } from 'lucide-react';
import { ComingSoonPage } from '@/components/layout/ComingSoonPage';

export default function ProcurementPage() {
  return (
    <ComingSoonPage
      icon={ShoppingCart}
      iconBg="bg-blue-500/10"
      iconColor="text-blue-500"
      title="Procurement"
      description="End-to-end procurement management - from RFQs to vendor selection and purchase order approvals."
      capabilities={[
        'Request for Quotation (RFQ) management',
        'Vendor comparison and selection matrix',
        'Purchase order creation and tracking',
        'Multi-level approval workflows',
        'Spend analytics and budget adherence',
        'Supplier contract lifecycle management',
      ]}
    />
  );
}
