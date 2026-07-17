'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Clock, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@sitepilot/ui';
import { projectDetails } from '@/data/demo';

export default function ProjectTimelinePage({ params }: { params: { id: string } }) {
  const project = projectDetails[params.id] || projectDetails['p1'];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold tracking-tight">Milestone Timeline</h3>
        <Button variant="outline">Edit Schedule</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="relative border-l border-border ml-6 md:ml-8 mt-8 mb-8 space-y-12 py-4">
            {project.timeline.map((item: any, i: number) => {
              const isCompleted = item.status === 'completed';
              const isInProgress = item.status === 'in-progress';
              
              return (
                <motion.div 
                  key={item.id} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="relative pl-8 md:pl-12 pr-6"
                >
                  <div className={`absolute -left-[17px] top-1 h-8 w-8 rounded-full border-4 border-background flex items-center justify-center
                    ${isCompleted ? 'bg-primary text-primary-foreground' : isInProgress ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'}`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : isInProgress ? <Clock className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
                  </div>
                  
                  <div className="bg-card border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                      <h4 className="font-semibold text-lg">{item.title}</h4>
                      <Badge variant={isCompleted ? 'default' : isInProgress ? 'secondary' : 'outline'} className="w-fit">
                        {item.status.replace('-', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(item.start), 'MMM dd, yyyy')} - {format(new Date(item.end), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
