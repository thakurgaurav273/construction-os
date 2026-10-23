'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Wallet } from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Progress,
  Skeleton,
} from '@sitepilot/ui';
import { useProject } from '@/hooks/api/use-projects';
import { EmptyState } from '@/components/shared/EmptyState';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--muted))'];

function formatCrore(n: number | null | undefined): string {
  if (n == null) return '-';
  return `₹${(n / 10_000_000).toFixed(2)} Cr`;
}

export default function ProjectBudgetPage({ params }: { params: { id: string } }) {
  const { data: project, isLoading } = useProject(params.id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-[320px] w-full rounded-xl" />
      </div>
    );
  }

  if (!project || project.budget == null) {
    return (
      <EmptyState
        icon={Wallet}
        title="No budget set for this project"
        description="Once a budget is allocated to this project, spend tracking and utilization will appear here."
      />
    );
  }

  const allocated = project.budget;
  const spent = project.spent;
  const remaining = allocated - spent;
  const utilization = allocated > 0 ? (spent / allocated) * 100 : 0;

  const distribution = [
    { name: 'Spent', value: spent },
    { name: 'Remaining', value: Math.max(remaining, 0) },
  ];

  return (
    <motion.div initial={false} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Allocated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCrore(allocated)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCrore(spent)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${remaining < 0 ? 'text-destructive' : 'text-emerald-600'}`}
            >
              {formatCrore(remaining)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Budget Utilization</CardTitle>
            <CardDescription>Spend against the total allocated budget</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{utilization.toFixed(1)}% utilized</span>
              <span className="text-muted-foreground">
                {formatCrore(spent)} / {formatCrore(allocated)}
              </span>
            </div>
            <Progress
              value={Math.min(utilization, 100)}
              className="h-3"
              indicatorColor={
                utilization > 90 ? 'bg-destructive' : utilization > 75 ? 'bg-amber-500' : 'bg-primary'
              }
            />
            <p className="text-xs text-muted-foreground pt-2">
              Reported progress on this project is {project.progress}%.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spend Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                  >
                    {distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatCrore(val)} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
