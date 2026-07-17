'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Users, DollarSign, Clock, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@sitepilot/ui';
import { Progress } from '@sitepilot/ui';
import { Button } from '@sitepilot/ui';
import { Badge } from '@sitepilot/ui';

import { projectDetails } from '@/data/demo';
import { useTimeline } from '@/hooks/api/use-timeline';


const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function ProjectOverviewPage({ params }: { params: { id: string } }) {
  const project = projectDetails[params.id] || projectDetails['p1'];
  const { data: timelineEvents = [] } = useTimeline();

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
    >
      {/* Description & About */}
      <motion.div variants={itemVariants} className="xl:col-span-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>About the Project</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">{project.description}</p>
            
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-6 border-t pt-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <Badge variant={project.status === 'on-track' ? 'default' : 'secondary'} className="capitalize">{project.status.replace('-', ' ')}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Start Date</p>
                <p className="font-medium">{format(new Date(project.startDate), 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Due Date</p>
                <p className="font-medium">{format(new Date(project.dueDate), 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Manager</p>
                <p className="font-medium">{project.manager}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={itemVariants} className="space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center"><DollarSign className="mr-2 h-4 w-4" /> Financials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(project.spent / 1000000).toFixed(1)}M <span className="text-sm font-normal text-muted-foreground">/ ${(project.budget / 1000000).toFixed(1)}M</span></div>
            <Progress value={(project.spent / project.budget) * 100} className="h-2 mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center"><Clock className="mr-2 h-4 w-4" /> Timeline Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.progress}% <span className="text-sm font-normal text-muted-foreground">completed</span></div>
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
              <CardDescription>Latest logs for {project.name}</CardDescription>
            </div>
            <Button variant="ghost" size="sm">View All <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(project.activity ?? []).map((act: any, idx: number) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${act.type === 'approval' ? 'bg-emerald-500/10 text-emerald-500' : act.type === 'alert' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                    {act.type === 'approval' ? <CheckCircle2 className="h-4 w-4" /> : act.type === 'alert' ? <AlertTriangle className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm">
                      <span className="font-semibold">{act.user}</span> {act.action} <span className="font-medium">{act.target}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{act.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Key Team Members */}
      <motion.div variants={itemVariants}>
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Key Personnel</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {project.team.slice(0, 3).map((member: { id: string; avatar: string; name: string; role: string }) => (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-sm font-bold shrink-0">
                    {member.avatar}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

    </motion.div>
  );
}
