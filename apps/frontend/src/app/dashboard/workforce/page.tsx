'use client';

import { Users } from 'lucide-react';
import { ComingSoonPage } from '@/components/layout/ComingSoonPage';

export default function WorkforcePage() {
  return (
    <ComingSoonPage
      icon={Users}
      iconBg="bg-emerald-500/10"
      iconColor="text-emerald-500"
      title="Workforce"
      description="Manage your entire workforce — employees, subcontractors, attendance, and payroll — from one place."
      capabilities={[
        'Organisation-wide employee directory',
        'Daily attendance and shift management',
        'Subcontractor onboarding and compliance',
        'Skill matrix and certification tracking',
        'Payroll integration and labour costing',
        'Performance reviews and appraisals',
      ]}
    />
  );
}
