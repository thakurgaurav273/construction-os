'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, Users, DollarSign, Clock, CheckCircle2, AlertTriangle, ArrowRight, TrendingUp, ShoppingCart } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Progress, Button, Skeleton } from '@sitepilot/ui';
import { useProject } from '@/hooks/api/use-projects';
import { UserAvatar } from '@/components/shared/UserAvatar';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

function statusVariant(status: string) {
  if (status === 'ACTIVE')    return 'default' as const;
  if (status === 'ON_HOLD')   return 'secondary' as const;
  if (status === 'COMPLETED') return 'outline' as const;
  return 'destructive' as const;
}

function activityIcon(type: string) {
  if (type === 'approval') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (type === 'alert')    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  if (type === 'update')   return <TrendingUp className="h-4 w-4 text-violet-500" />;
  if (type === 'purchase') return <ShoppingCart className="h-4 w-4 text-amber-500" />;
  return <FileText className="h-4 w-4 text-blue-500" />;
}

function activityBg(type: string) {
  if (type === 'approval') return 'bg-emerald-500/10';
  if (type === 'alert')    return 'bg-amber-500/10';
  if (type === 'update')   return 'bg-violet-500/10';
  return 'bg-primary/10';
}

function formatCrore(n: number | null | undefined) {
  if (!n) return '-';
  return `₹${(n / 10_000_000).toFixed(2)} Cr`;
}

function roleLabel(role: string) {
  const map: Record<string, string> = {
    MANAGER: 'Project Manager', ENGINEER: 'Engineer', VIEWER: 'Viewer',
    ADMIN: 'Admin', OWNER: 'Owner',
  };
  return map[role] ?? role;
}

export default function ProjectOverviewPage({ params }: { params: { id: string } }) {
  const { data: project, isLoading, isError } = useProject(params.id);

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="xl:col-span-2"><Skeleton className="h-64 rounded-xl" /></div>
        <div className="space-y-6"><Skeleton className="h-28 rounded-xl" /><Skeleton className="h-28 rounded-xl" /></div>
        <div className="xl:col-span-2"><Skeleton className="h-64 rounded-xl" /></div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-semibold">Failed to load project</p>
        <p className="text-muted-foreground mt-1">Please try refreshing the page.</p>
      </div>
    );
  }

  const budgetPct = project.budget ? Math.min((project.spent / project.budget) * 100, 100) : 0;
  const manager = project.members?.find((m) => m.role === 'MANAGER');

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {/* About */}
      <motion.div variants={itemVariants} className="xl:col-span-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>About the Project</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">{project.description ?? 'No description provided.'}</p>
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-6 border-t pt-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <Badge variant={statusVariant(project.status)} className="capitalize">
                  {project.status.replace('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Start Date</p>
                <p className="font-medium">
                  {project.startDate ? format(new Date(project.startDate), 'MMM dd, yyyy') : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Completion</p>
                <p className="font-medium">
                  {project.expectedCompletion ? format(new Date(project.expectedCompletion), 'MMM dd, yyyy') : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Client</p>
                <p className="font-medium">{project.clientName ?? '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Financials & Progress */}
      <motion.div variants={itemVariants} className="space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center">
              <DollarSign className="mr-2 h-4 w-4" /> Financials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCrore(project.spent)}{' '}
              <span className="text-sm font-normal text-muted-foreground">/ {formatCrore(project.budget)}</span>
            </div>
            <Progress value={budgetPct} className="h-2 mt-3" />
            <p className="text-xs text-muted-foreground mt-2">{budgetPct.toFixed(1)}% of budget utilised</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center">
              <Clock className="mr-2 h-4 w-4" /> Timeline Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {project.progress}%{' '}
              <span className="text-sm font-normal text-muted-foreground">completed</span>
            </div>
            <Progress value={project.progress} className="h-2 mt-3" />
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={itemVariants} className="xl:col-span-2">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest events for {project.name}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/projects/${params.id}/timeline`}>
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {(!project.activities || project.activities.length === 0) ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <div className="space-y-5">
                {project.activities.map((act, idx) => (
                  <div key={act.id} className="flex gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${activityBg(act.type)}`}>
                      {activityIcon(act.type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{act.title}</p>
                      {act.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{act.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {act.actor.name} &middot; {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Team */}
      <motion.div variants={itemVariants}>
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Key Personnel</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {(!project.members || project.members.length === 0) ? (
              <p className="text-sm text-muted-foreground">No members assigned.</p>
            ) : (
              <div className="space-y-4">
                {project.members.slice(0, 4).map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <UserAvatar name={member.user.name} avatar={member.user.avatar} className="h-9 w-9" fallbackClassName="text-xs" />
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium truncate">{member.user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{roleLabel(member.role)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
