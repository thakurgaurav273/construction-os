'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@sitepilot/ui';
import { TrendingUp } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCompactINR } from '@/features/procurement/utils/format';
import type { CashFlowEntry } from '@/features/finance/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const netTone = (value: number): string => (value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400');

export function CashFlowTab({ cashFlow, remainingBudget }: { cashFlow: CashFlowEntry[]; remainingBudget: number }): React.ReactElement {
  if (cashFlow.length === 0) {
    return <EmptyState icon={TrendingUp} title="No cash flow recorded" description="Monthly inflows, outflows and forecasts appear here once entered." />;
  }
  const actualMonths = cashFlow.filter((entry) => entry.outflow > 0);
  const burnRate = actualMonths.length ? actualMonths.reduce((sum, entry) => sum + entry.outflow, 0) / actualMonths.length : 0;
  const runway = burnRate > 0 ? Math.round(remainingBudget / burnRate) : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Burn rate</CardTitle><CardDescription>Average monthly outflow</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCompactINR(burnRate)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Budget runway</CardTitle><CardDescription>Months of remaining budget at current burn</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold">{runway === null ? '—' : `${runway} months`}</p></CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Month</th>
                <th className="px-4 py-3 text-right font-medium">Inflow</th>
                <th className="px-4 py-3 text-right font-medium">Outflow</th>
                <th className="px-4 py-3 text-right font-medium">Net</th>
                <th className="px-4 py-3 text-right font-medium">Forecast in</th>
                <th className="px-4 py-3 text-right font-medium">Forecast out</th>
                <th className="px-4 py-3 text-right font-medium">Forecast net</th>
              </tr>
            </thead>
            <tbody>
              {cashFlow.map((entry) => (
                <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">{MONTHS[entry.month - 1]} {entry.year}</td>
                  <td className="px-4 py-3 text-right">{formatCompactINR(entry.inflow)}</td>
                  <td className="px-4 py-3 text-right">{formatCompactINR(entry.outflow)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${netTone(entry.net)}`}>{formatCompactINR(entry.net)}</td>
                  <td className="px-4 py-3 text-right">{formatCompactINR(entry.forecastInflow)}</td>
                  <td className="px-4 py-3 text-right">{formatCompactINR(entry.forecastOutflow)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${netTone(entry.forecastNet)}`}>{formatCompactINR(entry.forecastNet)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
