import { DollarSign } from 'lucide-react';
import type { HelpModule } from '../types';

export const financeHelp: HelpModule = {
  key: 'finance',
  title: 'Finance',
  icon: DollarSign,
  routes: ['/dashboard/finance'],
  permission: 'finance.view',
  tour: 'finance',
  guides: [
    {
      id: 'finance.vendor-bill',
      title: 'Record a vendor bill',
      summary: 'Enter a supplier’s invoice and match it to the PO.',
      permission: 'invoice.create',
      keywords: ['invoice', 'gst'],
      steps: [
        'Open Finance and click Record Invoice.',
        'Pick the vendor and, if there is one, the purchase order it bills.',
        'Check the lines and GST, then submit for approval.',
      ],
    },
    {
      id: 'finance.payments',
      title: 'Request, approve and release a payment',
      summary: 'Pay approved bills with a maker-checker trail.',
      permission: 'payment.request',
      steps: [
        'From an approved vendor bill, request a payment for all or part of the amount.',
        'A second person approves the request.',
        'Once approved, the payment is released and the bill shows as part-paid or paid.',
      ],
    },
  ],
};
