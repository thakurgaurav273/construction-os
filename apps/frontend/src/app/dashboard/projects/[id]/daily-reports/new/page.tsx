'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { DailyReportForm } from '@/features/daily-reports/components/DailyReportForm';

export default function NewDailyReportPage({ params }: { params: { id: string } }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8 pb-20"
    >
      <div className="space-y-1">
        <Link
          href={`/dashboard/projects/${params.id}/daily-reports`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Reports
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">New Daily Report</h2>
        <p className="text-muted-foreground">
          Record today&apos;s progress, labour, materials and site issues. Save a draft anytime and submit when ready for review.
        </p>
      </div>

      <DailyReportForm projectId={params.id} />
    </motion.div>
  );
}
