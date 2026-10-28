'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Card, CardContent, CardHeader, CardTitle,
  Button, Tabs, TabsList, TabsTrigger, TabsContent, Skeleton,
} from '@sitepilot/ui';
import {
  Users, UserCheck, UserX, HardHat, ShieldCheck, Award,
  Download, UserPlus, ClipboardCheck,
} from 'lucide-react';
import { useWorkforce, useWorkforceStats } from '@/hooks/api/use-workforce';
import { downloadCsv } from '@/lib/download-csv';
import { EmptyState } from '@/components/shared/EmptyState';
import { ATTENDANCE_STATUS_STYLES, SHIFT_LABELS, WORKER_TYPE_LABELS } from '@/features/workforce/constants';
import { formatLastOnSite, toDisplayStatus } from '@/features/workforce/utils/attendance';
import { MarkAttendanceSheet } from '@/features/workforce/components/MarkAttendanceSheet';
import { WorkerFormDialog } from '@/features/workforce/components/WorkerFormDialog';
import { WorkerDrawer } from './components/WorkerDrawer';
import { DirectoryTab } from './components/DirectoryTab';
import { AttendanceTab } from './components/AttendanceTab';
import { TradesTab } from './components/TradesTab';
import { ComplianceTab } from './components/ComplianceTab';
import { WorkforceAlerts } from './components/WorkforceAlerts';
import { Can } from '@/components/shared/Can';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

interface KpiCardProps {
  title: string;
  value: number | string | undefined;
  description: string;
  icon: React.ReactNode;
  accentClass?: string;
}

function KpiCard({ title, value, description, icon, accentClass = '' }: KpiCardProps): React.ReactElement {
  return (
    <Card className={`hover:shadow-md transition-all group ${accentClass}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground group-hover:text-primary transition-colors">{icon}</div>
      </CardHeader>
      <CardContent>
        {value === undefined ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{value}</div>}
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function WorkforcePage(): React.ReactElement {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);

  const { data: workers = [], isLoading, isError, refetch } = useWorkforce({ includeInactive: true });
  const { data: stats } = useWorkforceStats();
  const activeWorkers = workers.filter((worker) => worker.isActive);
  const selectedWorker = workers.find((worker) => worker.id === selectedWorkerId) ?? null;

  function handleExport(): void {
    if (activeWorkers.length === 0) {
      toast.error('No workers to export');
      return;
    }
    downloadCsv(
      `workforce_${new Date().toISOString().slice(0, 10)}.csv`,
      ['Name', 'Role', 'Trade', 'Type', 'Shift', 'Project', 'Phone', 'Email', 'Today', 'Attendance % (30d)', 'Last on site', 'PPE compliant'],
      activeWorkers.map((worker) => [
        worker.name, worker.role, worker.trade, WORKER_TYPE_LABELS[worker.type], SHIFT_LABELS[worker.shift],
        worker.project, worker.phone, worker.email,
        ATTENDANCE_STATUS_STYLES[toDisplayStatus(worker.todayStatus)].label,
        worker.attendanceRate, formatLastOnSite(worker), worker.ppeCompliant ? 'Yes' : 'No',
      ]),
    );
    toast.success('Workforce export downloaded');
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Page Header */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Workforce</h2>
          <p className="text-muted-foreground mt-1">
            {stats ? `${stats.total} active workers across your sites` : 'Workers, daily attendance and compliance'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Can permission="attendance.mark">
            <Button variant="outline" onClick={() => setAttendanceOpen(true)} data-tour="workforce-attendance">
              <ClipboardCheck className="mr-2 h-4 w-4" /> Mark Attendance
            </Button>
          </Can>
          <Can permission="workforce.manage">
            <Button onClick={() => setAddOpen(true)} data-tour="workforce-new">
              <UserPlus className="mr-2 h-4 w-4" /> Add Worker
            </Button>
          </Can>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        <motion.div variants={itemVariants}>
          <KpiCard title="Total Workforce" value={stats?.total} description="Active across all sites" icon={<Users className="h-4 w-4" />} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            title="On Site Today"
            value={stats?.presentToday}
            description={`${stats?.onLeaveToday ?? 0} on leave · ${stats?.notMarkedToday ?? 0} not marked`}
            icon={<UserCheck className="h-4 w-4" />}
            accentClass="border-emerald-200 dark:border-emerald-800/30"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            title="Absent Today"
            value={stats?.absentToday}
            description="Marked absent"
            icon={<UserX className="h-4 w-4" />}
            accentClass="border-red-200 dark:border-red-800/30"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard title="Subcontractors" value={stats?.subcontractors} description="From external firms" icon={<HardHat className="h-4 w-4" />} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            title="Safety Compliance"
            value={stats ? `${stats.safetyCompliance}%` : undefined}
            description="PPE compliant workers"
            icon={<ShieldCheck className="h-4 w-4" />}
            accentClass={(stats?.safetyCompliance ?? 0) >= 90 ? 'border-emerald-200 dark:border-emerald-800/30' : 'border-amber-200 dark:border-amber-800/30'}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            title="Certifications to Renew"
            value={stats ? stats.expiringCerts + stats.expiredCerts : undefined}
            description={stats?.expiredCerts ? `${stats.expiredCerts} with an expired cert` : 'Expiring within 30 days'}
            icon={<Award className="h-4 w-4" />}
            accentClass={stats?.expiredCerts ? 'border-red-200 dark:border-red-800/30' : 'border-amber-200 dark:border-amber-800/30'}
          />
        </motion.div>
      </motion.div>

      {/* Main Content + Alerts */}
      <div className="grid gap-6 xl:grid-cols-4">
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="min-w-0 xl:col-span-3"
        >
          {isLoading && <Skeleton className="h-[420px] w-full rounded-xl" />}
          {isError && (
            <EmptyState
              icon={Users}
              title="Unable to load the workforce"
              description="Check your connection and try again."
              action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
            />
          )}
          {!isLoading && !isError && workers.length === 0 && (
            <EmptyState
              icon={Users}
              title="No workers yet"
              description="Add your site crew to start tracking daily attendance, trades and compliance."
              action={<Can permission="workforce.manage"><Button onClick={() => setAddOpen(true)}><UserPlus className="mr-2 h-4 w-4" /> Add Worker</Button></Can>}
              guide={{ id: 'workforce.add-worker', label: 'Learn how to build your crew' }}
            />
          )}
          {!isLoading && !isError && workers.length > 0 && (
            <Tabs defaultValue="directory">
              <TabsList className="mb-4" data-tour="workforce-tabs">
                <TabsTrigger value="directory">Directory</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                <TabsTrigger value="trades">Trades</TabsTrigger>
                <TabsTrigger value="compliance">Compliance</TabsTrigger>
              </TabsList>

              <TabsContent value="directory">
                <DirectoryTab workers={workers} onSelectWorker={(worker) => setSelectedWorkerId(worker.id)} />
              </TabsContent>
              <TabsContent value="attendance">
                <AttendanceTab workers={activeWorkers} stats={stats} onMarkAttendance={() => setAttendanceOpen(true)} />
              </TabsContent>
              <TabsContent value="trades">
                <TradesTab workers={activeWorkers} />
              </TabsContent>
              <TabsContent value="compliance">
                <ComplianceTab workers={activeWorkers} />
              </TabsContent>
            </Tabs>
          )}
        </motion.div>

        <motion.div
          initial={false}
          animate={{ opacity: 1, x: 0 }}
          className="xl:col-span-1"
        >
          <WorkforceAlerts stats={stats} onMarkAttendance={() => setAttendanceOpen(true)} />
        </motion.div>
      </div>

      <WorkerDrawer worker={selectedWorker} open={selectedWorker !== null} onClose={() => setSelectedWorkerId(null)} />
      <WorkerFormDialog open={addOpen} onOpenChange={setAddOpen} />
      <MarkAttendanceSheet open={attendanceOpen} onOpenChange={setAttendanceOpen} />
    </div>
  );
}
