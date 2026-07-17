'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { DollarSign, ArrowUpRight, ArrowDownRight, MoreHorizontal } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Progress } from '@sitepilot/ui';
import { projectDetails } from '@/data/demo';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--muted-foreground))'];

export default function ProjectBudgetPage({ params }: { params: { id: string } }) {
  const project = projectDetails[params.id] || projectDetails['p1'];

  const totalAllocated = project.budgetBreakdown.reduce((acc: number, curr: any) => acc + curr.allocated, 0);
  const totalSpent = project.budgetBreakdown.reduce((acc: number, curr: any) => acc + curr.spent, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Allocated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalAllocated / 1000000).toFixed(1)}M</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalSpent / 1000000).toFixed(1)}M</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">${((totalAllocated - totalSpent) / 1000000).toFixed(1)}M</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Budget Breakdown</CardTitle>
              <CardDescription>Expenditure against allocated budget per category</CardDescription>
            </div>
            <Button variant="outline" size="sm">Export CSV</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {project.budgetBreakdown.map((item: any) => {
                const percent = (item.spent / item.allocated) * 100;
                return (
                  <div key={item.category} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.category}</span>
                      <span className="text-muted-foreground">
                        ${(item.spent / 1000000).toFixed(1)}M / ${(item.allocated / 1000000).toFixed(1)}M
                      </span>
                    </div>
                    <Progress value={percent} className="h-2" indicatorColor={percent > 90 ? "bg-destructive" : percent > 75 ? "bg-amber-500" : "bg-primary"} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Allocation Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={project.budgetBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="allocated"
                    nameKey="category"
                  >
                    {project.budgetBreakdown.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => `$${(val/1000000).toFixed(1)}M`} />
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
