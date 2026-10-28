'use client';

import React from 'react';
import { format } from 'date-fns';
import { AlertTriangle, BarChart3, Plus } from 'lucide-react';
import { Button, Skeleton } from '@sitepilot/ui';
import { Can } from '@/components/shared/Can';
import { EmptyState } from '@/components/shared/EmptyState';
import { ApprovalsCard } from '@/features/dashboard/components/ApprovalsCard';
import { InsightsCard } from '@/features/dashboard/components/InsightsCard';
import { KpiCards } from '@/features/dashboard/components/KpiCards';
import { ProjectOverview } from '@/features/dashboard/components/ProjectOverview';
import { RecentActivity } from '@/features/dashboard/components/RecentActivity';
import { AttendanceTrendCard, SpendTrendCard } from '@/features/dashboard/components/TrendCards';
import { greeting } from '@/features/dashboard/format';
import { GettingStartedChecklist } from '@/features/help/components/GettingStartedChecklist';
import { useCan } from '@/hooks/api/use-access';
import { useDashboardStats } from '@/hooks/api/use-dashboard';
import { useOrganizationSettings } from '@/hooks/api/use-settings';
import { useAuthStore } from '@/store/auth.store';
import { PageAction, PageHeader } from '@/components/shared/PageHeader';

function DashboardSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <Skeleton className="h-[380px] rounded-xl lg:col-span-4" />
        <Skeleton className="h-[380px] rounded-xl lg:col-span-3" />
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

export default function DashboardPage(): React.ReactElement {
  const user = useAuthStore((state) => state.user);
  const organization = useAuthStore((state) => state.organization);
  const { data: organizationSettings } = useOrganizationSettings();
  const { data: stats, isLoading, isError, refetch } = useDashboardStats();
  const can = useCan();
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const organizationName = organizationSettings?.name ?? organization?.name;
  const now = new Date();

  function content(): React.ReactNode {
    if (isLoading) return <DashboardSkeleton />;
    if (isError || !stats) {
      return (
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load the dashboard"
          description="Your projects and approvals couldn't be fetched. Check your connection and try again."
          action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
        />
      );
    }
    const showInsights = can('ai.use');
    const showAttendance = can('workforce.view');
    return (
      <>
        <GettingStartedChecklist />
        <KpiCards stats={stats} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
          <div className="lg:col-span-4">
            {stats.spendTrend ? <SpendTrendCard trend={stats.spendTrend} /> : showAttendance && <AttendanceTrendCard />}
          </div>
          <div className="space-y-4 lg:col-span-3">
            <ApprovalsCard queues={stats.approvals.queues} />
            {showInsights && <InsightsCard />}
          </div>
        </div>
        <ProjectOverview projects={stats.projects} totalProjects={stats.totalProjects} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className={stats.spendTrend && showAttendance ? 'lg:col-span-2' : 'lg:col-span-3'}><RecentActivity activities={stats.recentActivity} /></div>
          {stats.spendTrend && showAttendance && <AttendanceTrendCard />}
        </div>
      </>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      {/* The greeting depends on the viewer's clock, which the server can't know. */}
      <PageHeader
        title={<span suppressHydrationWarning>{greeting(now.getHours())}, {firstName}.</span>}
        description={<span suppressHydrationWarning>{organizationName ? `${organizationName} · ` : ''}{format(now, 'EEEE, d MMMM yyyy')}</span>}
        actions={(
          <>
            <Can permission="report.view">
              <PageAction icon={BarChart3} label="Reports" href="/dashboard/reports" />
            </Can>
            <Can permission="project.create">
              <PageAction primary icon={Plus} label="New Project" href="/dashboard/projects" data-tour="dashboard-new-project" />
            </Can>
          </>
        )}
      />
      {content()}
    </div>
  );
}
