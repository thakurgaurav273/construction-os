'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  Building2, DollarSign, Users, ClipboardCheck, ArrowUpRight, 
  ArrowDownRight, CloudRain, Lightbulb, Bell, Plus, CheckCircle2, Clock, AlertTriangle, AlertCircle, FileText, ShoppingCart
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge, Progress, Skeleton } from '@sitepilot/ui';

import { 
  company, kpis, activeProjects, budgetTrendData, 
  workforceTrendData, recentActivity, aiInsights, weatherAlerts 
} from '@/data/demo';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

// Simulated Animated Counter
function AnimatedCounter({ value, prefix = '', suffix = '', decimals = 0 }: { value: number, prefix?: string, suffix?: string, decimals?: number }) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 1500;
    let startTime: number | null = null;
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      // easeOutQuart
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setCount(start + (end - start) * easeProgress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
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

export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (!isClient) return null;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Top Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start justify-between space-y-4 sm:space-y-0"
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Good morning, Alex.</h2>
          <p className="text-muted-foreground mt-1">
            {company.name} &bull; {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">Download Report</Button>
          <Button><Plus className="mr-2 h-4 w-4" /> New Project</Button>
        </div>
      </motion.div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          {/* Active Projects KPI */}
          <motion.div variants={itemVariants}>
            <Card className="hover:shadow-md transition-all duration-200 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Active Projects</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold"><AnimatedCounter value={kpis.activeProjects} /></div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  <span className="text-emerald-500 flex items-center mr-1"><ArrowUpRight className="h-3 w-3" /> +1</span> from last month
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Budget Utilization KPI */}
          <motion.div variants={itemVariants}>
            <Card className="hover:shadow-md transition-all duration-200 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Budget Utilization</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold"><AnimatedCounter value={kpis.budgetUtilization} decimals={1} suffix="%" /></div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  <span className="text-amber-500 flex items-center mr-1"><ArrowUpRight className="h-3 w-3" /> +2.4%</span> vs plan
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Workforce KPI */}
          <motion.div variants={itemVariants}>
            <Card className="hover:shadow-md transition-all duration-200 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Workforce Today</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold"><AnimatedCounter value={kpis.workforceToday} /></div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  <span className="text-destructive flex items-center mr-1"><ArrowDownRight className="h-3 w-3" /> -12</span> absent today
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Pending Approvals KPI */}
          <motion.div variants={itemVariants}>
            <Card className="hover:shadow-md transition-all duration-200 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Pending Approvals</CardTitle>
                <ClipboardCheck className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold"><AnimatedCounter value={kpis.pendingApprovals} /></div>
                <p className="text-xs text-muted-foreground mt-1">
                  Requires your attention
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* Main Content Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate={loading ? "hidden" : "show"}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-7"
      >
        {/* Budget vs Spend Chart */}
        <motion.div variants={itemVariants} className="col-span-4">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Budget vs Spend</CardTitle>
              <CardDescription>YTD aggregate across all active projects</CardDescription>
            </CardHeader>
            <CardContent className="pl-0">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={budgetTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} dy={10} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}}
                      tickFormatter={(value) => `$${value / 1000000}M`}
                      dx={-10}
                    />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => [`$${(value / 1000000).toFixed(1)}M`, undefined]}
                    />
                    <Area type="monotone" dataKey="budget" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorBudget)" name="Planned Budget" />
                    <Area type="monotone" dataKey="spend" stroke="hsl(var(--destructive))" strokeWidth={2} fillOpacity={1} fill="url(#colorSpend)" name="Actual Spend" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Insights & Weather */}
        <motion.div variants={itemVariants} className="col-span-3 space-y-4">
          <Card className="border-primary/20 bg-primary/5 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Lightbulb size={120} />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-primary">
                <Lightbulb className="mr-2 h-5 w-5" /> SitePilot AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10">
              {aiInsights.map(insight => (
                <div key={insight.id} className="bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-1">
                    {insight.type === 'warning' ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    <span className="font-semibold text-sm">{insight.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Weather Alert: {weatherAlerts.location}</CardTitle>
              <CloudRain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold">{weatherAlerts.temp}</span>
                <span className="text-sm font-medium">{weatherAlerts.current}</span>
              </div>
              <p className="text-xs text-muted-foreground">{weatherAlerts.forecast}</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Projects Overview */}
      <motion.div variants={itemVariants} initial="hidden" animate={loading ? "hidden" : "show"}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Project Overview</CardTitle>
              <CardDescription>Status and progress of all active sites.</CardDescription>
            </div>
            <Button variant="outline" size="sm">View All</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {activeProjects.map((project) => (
                <div key={project.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{project.name}</h4>
                      <Badge variant={project.status === 'on-track' ? 'default' : project.status === 'delayed' ? 'secondary' : 'destructive'} className="h-5">
                        {project.status === 'on-track' ? 'On Track' : project.status === 'delayed' ? 'Delayed' : 'At Risk'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-4">
                      <span className="flex items-center"><Users className="mr-1 h-3 w-3"/> {project.manager}</span>
                      <span className="flex items-center"><Clock className="mr-1 h-3 w-3"/> Due {format(new Date(project.dueDate), 'MMM yyyy')}</span>
                    </div>
                  </div>
                  
                  <div className="w-full sm:w-1/3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                  </div>
                  
                  <div className="w-full sm:w-1/5 text-right space-y-1">
                    <div className="text-sm text-muted-foreground">Spend vs Budget</div>
                    <div className="font-medium">${(project.spent / 1000000).toFixed(1)}M / ${(project.budget / 1000000).toFixed(1)}M</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom Grid: Activity & Workforce */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate={loading ? "hidden" : "show"}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        <motion.div variants={itemVariants} className="col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest actions across your organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {recentActivity.map((activity, index) => (
                  <div key={activity.id} className="flex gap-4">
                    <div className="relative flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted border border-border shrink-0 z-10">
                        {activity.type === 'approval' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        {activity.type === 'alert' && <AlertCircle className="h-4 w-4 text-destructive" />}
                        {activity.type === 'report' && <FileText className="h-4 w-4 text-blue-500" />}
                        {activity.type === 'material' && <ShoppingCart className="h-4 w-4 text-amber-500" />}
                      </div>
                      {index !== recentActivity.length - 1 && (
                        <div className="absolute top-8 bottom-[-24px] w-px bg-border"></div>
                      )}
                    </div>
                    <div className="flex flex-col pb-2">
                      <p className="text-sm">
                        <span className="font-semibold text-foreground">{activity.user}</span>{' '}
                        <span className="text-muted-foreground">{activity.action}</span>{' '}
                        <span className="font-medium text-foreground">{activity.target}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
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
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                      cursor={{ fill: 'hsl(var(--muted))' }}
                    />
                    <Bar dataKey="workers" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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
