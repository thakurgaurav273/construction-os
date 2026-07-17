'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import {
  Building2, DollarSign, Users, ClipboardCheck, ArrowUpRight,
  ArrowDownRight, CloudRain, Lightbulb, Plus, CheckCircle2, Clock,
  AlertTriangle, AlertCircle, FileText, ShoppingCart, TrendingUp,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge, Progress, Skeleton } from '@sitepilot/ui';
import { useAuthStore } from '@/store/auth.store';
import { useDashboardStats } from '@/hooks/api/use-dashboard';
import { aiInsights, weatherAlerts, workforceTrendData } from '@/data/demo';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

function AnimatedCounter({ value, prefix = '', suffix = '', decimals = 0 }: {
  value: number; prefix?: string; suffix?: string; decimals?: number;
}) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime: number | null = null;
    const animate = (t: number) => {
      if (!startTime) startTime = t;
      const progress = Math.min((t - startTime) / 1200, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      setCount(value * ease);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return (
    <span>
      {prefix}
      {count.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

function statusBadgeVariant(status: string) {
  if (status === 'ACTIVE') return 'default';
  if (status === 'ON_HOLD') return 'secondary';
  if (status === 'COMPLETED') return 'outline';
  return 'destructive';
}

function activityIcon(type: string) {
  if (type === 'approval') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (type === 'alert')    return <AlertCircle className="h-4 w-4 text-destructive" />;
  if (type === 'report')   return <FileText className="h-4 w-4 text-blue-500" />;
  if (type === 'update')   return <TrendingUp className="h-4 w-4 text-violet-500" />;
  return <ShoppingCart className="h-4 w-4 text-amber-500" />;
}

function formatCrore(n: number | null | undefined) {
  if (!n) return '-';
  const cr = n / 10_000_000;
  return `₹${cr.toFixed(1)} Cr`;
}

export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false);
  const user = useAuthStore((state) => state.user);
  const { data: stats, isLoading } = useDashboardStats();

  useEffect(() => { setIsClient(true); }, []);
  if (!isClient) return null;

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  const kpis = {
    activeProjects:    stats?.activeProjects    ?? 0,
    budgetUtilization: stats?.budgetUtilization ?? 0,
    totalBudget:       stats?.totalBudget       ?? 0,
    totalSpent:        stats?.totalSpent        ?? 0,
  };

  const budgetTrendData = stats?.budgetTrend ?? [];
  const projects        = stats?.projects    ?? [];
  const recentActivity  = stats?.recentActivity ?? [];

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {firstName}.
          </h2>
          <p className="text-muted-foreground mt-1">
            Grovyn &bull; {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">Download Report</Button>
          <Button asChild>
            <Link href="/dashboard/projects"><Plus className="mr-2 h-4 w-4" /> New Project</Link>
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show"
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <motion.div variants={itemVariants}>
            <Card className="hover:shadow-md transition-all group">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Projects</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold"><AnimatedCounter value={kpis.activeProjects} /></div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  <span className="text-emerald-500 flex items-center mr-1"><ArrowUpRight className="h-3 w-3" />+1</span> from last month
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="hover:shadow-md transition-all group">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Budget Utilization</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold"><AnimatedCounter value={kpis.budgetUtilization} decimals={1} suffix="%" /></div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCrore(kpis.totalSpent)} of {formatCrore(kpis.totalBudget)}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="hover:shadow-md transition-all group">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Workforce Today</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground mt-1">Attendance module coming soon</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="hover:shadow-md transition-all group">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
                <ClipboardCheck className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold"><AnimatedCounter value={0} /></div>
                <p className="text-xs text-muted-foreground mt-1">All caught up</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* Charts Row */}
      <motion.div variants={containerVariants} initial="hidden" animate={isLoading ? 'hidden' : 'show'}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <motion.div variants={itemVariants} className="col-span-4">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Budget vs Spend</CardTitle>
              <CardDescription>YTD aggregate across all projects (₹ Crore)</CardDescription>
            </CardHeader>
            <CardContent className="pl-0">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={budgetTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickFormatter={(v) => `₹${(v / 10_000_000).toFixed(0)}Cr`} dx={-10} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                      formatter={(v: number) => [`₹${(v / 10_000_000).toFixed(2)} Cr`, undefined]}
                    />
                    <Area type="monotone" dataKey="budget" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorBudget)" name="Planned" />
                    <Area type="monotone" dataKey="spend"  stroke="hsl(var(--destructive))" strokeWidth={2} fillOpacity={1} fill="url(#colorSpend)" name="Actual" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="col-span-3 space-y-4">
          <Card className="border-primary/20 bg-primary/5 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Lightbulb size={120} /></div>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-primary">
                <Lightbulb className="mr-2 h-5 w-5" /> SitePilot AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 relative z-10">
              {aiInsights.map((insight) => (
                <div key={insight.id} className="bg-card border rounded-lg p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    {insight.type === 'warning'
                      ? <AlertTriangle className="h-4 w-4 text-amber-500" />
                      : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    <span className="font-semibold text-sm">{insight.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Weather: {weatherAlerts.location}</CardTitle>
              <CloudRain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xl font-bold">{weatherAlerts.temp}</span>
                <span className="text-sm font-medium">{weatherAlerts.current}</span>
              </div>
              <p className="text-xs text-muted-foreground">{weatherAlerts.forecast}</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Project Overview */}
      <motion.div variants={itemVariants} initial="hidden" animate={isLoading ? 'hidden' : 'show'}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Project Overview</CardTitle>
              <CardDescription>Status and progress of all active sites</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/projects">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading
                ? [1,2,3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)
                : projects.map((project) => (
                  <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold">{project.name}</h4>
                          <Badge variant={statusBadgeVariant(project.status)} className="h-5 capitalize text-xs">
                            {project.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-4">
                          <span className="flex items-center"><Users className="mr-1 h-3 w-3" />{project.memberCount} members</span>
                          {project.expectedCompletion && (
                            <span className="flex items-center"><Clock className="mr-1 h-3 w-3" />Due {format(new Date(project.expectedCompletion), 'MMM yyyy')}</span>
                          )}
                        </div>
                      </div>
                      <div className="w-full sm:w-1/3 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span className="font-medium">{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} className="h-2" />
                      </div>
                      <div className="hidden sm:block text-right space-y-0.5">
                        <div className="text-xs text-muted-foreground">Spend / Budget</div>
                        <div className="font-medium text-sm">{formatCrore(project.spent)} / {formatCrore(project.budget)}</div>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Activity & Workforce */}
      <motion.div variants={containerVariants} initial="hidden" animate={isLoading ? 'hidden' : 'show'}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <motion.div variants={itemVariants} className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest actions across your organisation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {isLoading
                  ? [1,2,3].map((i) => <Skeleton key={i} className="h-10 rounded" />)
                  : recentActivity.length === 0
                    ? <p className="text-sm text-muted-foreground">No recent activity.</p>
                    : recentActivity.map((activity, index) => (
                      <div key={activity.id} className="flex gap-4">
                        <div className="relative flex flex-col items-center">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted border shrink-0 z-10">
                            {activityIcon(activity.type)}
                          </div>
                          {index !== recentActivity.length - 1 && (
                            <div className="absolute top-8 bottom-[-20px] w-px bg-border" />
                          )}
                        </div>
                        <div className="pb-2">
                          <p className="text-sm font-medium">{activity.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {activity.actor.name} &middot; {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Workforce Trend</CardTitle>
              <CardDescription>Daily attendance over last 7 days</CardDescription>
            </CardHeader>
            <CardContent className="pl-0 pb-0">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workforceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Bar dataKey="workers" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
