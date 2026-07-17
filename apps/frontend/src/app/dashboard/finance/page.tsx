'use client';

import { DollarSign } from 'lucide-react';
import { ComingSoonPage } from '@/components/layout/ComingSoonPage';

export default function FinancePage() {
  return (
    <ComingSoonPage
      icon={DollarSign}
      iconBg="bg-green-500/10"
      iconColor="text-green-500"
      title="Finance"
      description="Full financial visibility across every project - budgets, invoices, payments, and cash flow in one view."
      capabilities={[
        'Organisation-wide budget management',
        'Invoice creation and approval workflows',
        'Payment tracking and reconciliation',
        'Cash flow forecasting',
        'Cost variance and earned value analysis',
        'Financial reports and GST compliance',
      ]}
    />
  );
}
