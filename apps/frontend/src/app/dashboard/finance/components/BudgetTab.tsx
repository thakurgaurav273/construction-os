'use client';

import React from 'react';
import { Card, CardContent, Progress } from '@sitepilot/ui';
import { PiggyBank } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCompactINR } from '@/features/procurement/utils/format';
import type { BudgetLine } from '@/features/finance/types';

export function BudgetTab({ budget }: { budget: BudgetLine[] }): React.ReactElement {
  if (budget.length === 0) {
    return <EmptyState icon={PiggyBank} title="No budgets yet" description="Project budgets by cost category appear here once they are set up." />;
  }
  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Project</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-right font-medium">Allocated</th>
              <th className="px-4 py-3 text-right font-medium">Spent</th>
              <th className="px-4 py-3 text-right font-medium">Committed</th>
              <th className="px-4 py-3 text-right font-medium">Remaining</th>
              <th className="px-4 py-3 text-left font-medium min-w-[160px]">Utilization</th>
            </tr>
          </thead>
          <tbody>
            {budget.map((line) => (
              <tr key={line.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">{line.projectName}</td>
                <td className="px-4 py-3">{line.category}</td>
                <td className="px-4 py-3 text-right">{formatCompactINR(line.allocated)}</td>
                <td className="px-4 py-3 text-right">{formatCompactINR(line.spent)}</td>
                <td className="px-4 py-3 text-right">{formatCompactINR(line.committed)}</td>
                <td className={`px-4 py-3 text-right ${line.remaining < 0 ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>{formatCompactINR(line.remaining)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Progress value={Math.min(100, line.utilizationPercent)} className="h-2 flex-1" />
                    <span className={`text-xs w-10 text-right ${line.utilizationPercent >= 90 ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>{line.utilizationPercent}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
