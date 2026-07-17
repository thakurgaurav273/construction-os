'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Tabs, TabsList, TabsTrigger, TabsContent,
} from '@sitepilot/ui';
import {
  Users, UserCheck, UserX, HardHat, ShieldCheck, Award,
  Download, UserPlus, Lightbulb, AlertTriangle, TrendingUp,
} from 'lucide-react';
import { workers as demoWorkers } from '@/data/workforce-demo';
import type { Worker } from '@/data/workforce-demo';
import { WorkerDrawer } from './components/WorkerDrawer';
import { DirectoryTab } from './components/DirectoryTab';
import { AttendanceTab } from './components/AttendanceTab';
import { TradesTab } from './components/TradesTab';
import { ComplianceTab } from './components/ComplianceTab';
import { useWorkforce, useWorkforceStats } from '@/hooks/api/use-workforce';

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
  value: number | string;
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
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function WorkforcePage(): React.ReactElement {
  const [isClient, setIsClient] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: apiWorkers } = useWorkforce();
  const { data: apiStats } = useWorkforceStats();

  useEffect(() => { setIsClient(true); }, []);
  if (!isClient) return <></>;

  const workers = apiWorkers ?? demoWorkers;

  const kpis = apiStats ?? {
    total:            workers.length,
    presentToday:     workers.filter((w) => w.status === 'active' || w.status === 'late').length,
    absentToday:      workers.filter((w) => w.status === 'absent').length,
    subcontractors:   workers.filter((w) => w.type === 'Subcontractor').length,
    safetyCompliance: workers.length
      ? Math.round((workers.filter((w) => w.ppeCompliant).length / workers.length) * 100)
      : 0,
    expiringCerts:    workers.filter((w) => w.certifications.some((c) => c.status === 'expiring')).length,
  };

  function handleSelectWorker(worker: Worker): void {
    setSelectedWorker(worker);
    setDrawerOpen(true);
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Workforce</h2>
          <p className="text-muted-foreground mt-1">
            {kpis.total} workers across active projects
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" /> Add Worker
          </Button>
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
          <KpiCard
            title="Total Workforce"
            value={kpis.total}
            description="Across all sites"
            icon={<Users className="h-4 w-4" />}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            title="Present Today"
            value={kpis.presentToday}
            description={`${kpis.total - kpis.presentToday - kpis.absentToday} on leave`}
            icon={<UserCheck className="h-4 w-4" />}
            accentClass="border-emerald-200 dark:border-emerald-800/30"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            title="Absent Today"
            value={kpis.absentToday}
            description="No prior notification"
            icon={<UserX className="h-4 w-4" />}
            accentClass="border-red-200 dark:border-red-800/30"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            title="Subcontractors"
            value={kpis.subcontractors}
            description="From external firms"
            icon={<HardHat className="h-4 w-4" />}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            title="Safety Compliance"
            value={`${kpis.safetyCompliance}%`}
            description="PPE compliant workers"
            icon={<ShieldCheck className="h-4 w-4" />}
            accentClass={kpis.safetyCompliance >= 90 ? 'border-emerald-200 dark:border-emerald-800/30' : 'border-amber-200 dark:border-amber-800/30'}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            title="Open Certifications"
            value={kpis.expiringCerts}
            description="Expiring within 30 days"
            icon={<Award className="h-4 w-4" />}
            accentClass="border-amber-200 dark:border-amber-800/30"
          />
        </motion.div>
      </motion.div>

      {/* Main Content + AI Insight */}
      <div className="grid gap-6 xl:grid-cols-4">
        {/* Tabs - takes 3/4 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="xl:col-span-3"
        >
          <Tabs defaultValue="directory">
            <TabsList className="mb-4">
              <TabsTrigger value="directory">Directory</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="trades">Trades</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
            </TabsList>

            <TabsContent value="directory">
              <DirectoryTab workers={workers} onSelectWorker={handleSelectWorker} />
            </TabsContent>

            <TabsContent value="attendance">
              <AttendanceTab workers={workers} />
            </TabsContent>

            <TabsContent value="trades">
              <TradesTab />
            </TabsContent>

            <TabsContent value="compliance">
              <ComplianceTab workers={workers} />
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* AI Insight Panel */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="xl:col-span-1"
        >
          <Card className="border-primary/20 bg-primary/5 overflow-hidden relative sticky top-6">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Lightbulb size={100} />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-primary text-sm">
                <Lightbulb className="h-4 w-4" />
                AI Workforce Insights
              </CardTitle>
              <CardDescription className="text-xs">Real-time workforce intelligence</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 relative z-10">
              <div className="bg-card border rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="text-xs font-semibold">Low Utilization Alert</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Electrical crew utilization is 80%. Consider reallocating 2 workers to Smart City Sector 9 which is understaffed.
                </p>
              </div>

              <div className="bg-card border rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  <span className="text-xs font-semibold">Concrete Crew Understaffed</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Marina Bay Level 15 pour is scheduled for tomorrow but 2 concrete workers are absent today. Arrange standby crew.
                </p>
              </div>

              <div className="bg-card border rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="text-xs font-semibold">Certifications Expiring</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {kpis.expiringCerts} workers have certifications expiring within 30 days. Schedule renewal training this week.
                </p>
              </div>

              <div className="bg-card border rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="text-xs font-semibold">Attendance Improving</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Overall attendance rate improved by 4% this week compared to Wk 26. Rajesh Kumar and Ramesh Singh teams leading at 95%+.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Worker Detail Drawer */}
      <WorkerDrawer
        worker={selectedWorker}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
