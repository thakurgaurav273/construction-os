import React from 'react';
import Link from 'next/link';
import { Building2, ClipboardCheck, IndianRupee, Users, type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@sitepilot/ui';
import { formatCrore } from '../format';
import type { DashboardStats } from '../types';

interface KpiCardProps {
  title: string;
  icon: LucideIcon;
  value: React.ReactNode;
  hint: string;
  href?: string;
}

function KpiCard({ title, icon: Icon, value, hint, href }: KpiCardProps): React.ReactElement {
  const card = (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
  if (!href) return card;
  return <Link href={href} className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{card}</Link>;
}

export function KpiCards({ stats }: { stats: DashboardStats }): React.ReactElement {
  const firstQueue = stats.approvals.queues[0];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Active Projects"
        icon={Building2}
        value={stats.activeProjects}
        hint={`${stats.totalProjects} in total${stats.newProjects > 0 ? `, ${stats.newProjects} added in the last 30 days` : ''}`}
        href="/dashboard/projects"
      />
      <KpiCard
        title="Budget Utilization"
        icon={IndianRupee}
        value={`${stats.budgetUtilization}%`}
        hint={`${formatCrore(stats.totalSpent)} spent of ${formatCrore(stats.totalBudget)}`}
      />
      {stats.workforceToday !== null && (
        <KpiCard
          title="Workforce Today"
          icon={Users}
          value={<>{stats.workforceToday}<span className="text-sm font-normal text-muted-foreground"> / {stats.workforceTotal}</span></>}
          hint={(stats.workforceNotMarked ?? 0) > 0 ? `${stats.workforceNotMarked} not marked yet` : 'Attendance marked for everyone'}
          href="/dashboard/workforce"
        />
      )}
      <KpiCard
        title="Waiting for You"
        icon={ClipboardCheck}
        value={stats.approvals.total}
        hint={stats.approvals.total > 0 ? 'Approvals across your modules' : 'All caught up'}
        href={stats.approvals.queues.length === 1 ? firstQueue?.href : undefined}
      />
    </div>
  );
}
