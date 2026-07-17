'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@sitepilot/ui';
import { projectDetails } from '@/data/demo';

export default function ProjectTeamPage({ params }: { params: { id: string } }) {
  const project = projectDetails[params.id] || projectDetails['p1'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold tracking-tight">Project Team</h3>
        <Button>Add Member</Button>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {project.team.map((member: any, i: number) => (
          <motion.div 
            key={member.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold mb-4">
                    {member.avatar}
                  </div>
                  <Button variant="ghost" size="icon" className="-mt-2 -mr-2">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
                <h4 className="font-semibold text-lg">{member.name}</h4>
                <p className="text-sm text-primary mb-4 font-medium">{member.role}</p>
                
                <div className="space-y-2 pt-4 border-t border-border/50">
                  <a href={`mailto:${member.email}`} className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Mail className="mr-2 h-4 w-4" /> {member.email}
                  </a>
                  <a href="#" className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Phone className="mr-2 h-4 w-4" /> +1 (555) 000-0000
                  </a>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
