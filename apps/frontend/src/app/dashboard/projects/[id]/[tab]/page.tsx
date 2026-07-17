'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileQuestion } from 'lucide-react';
import { Button } from '@sitepilot/ui';

export default function ProjectDynamicTabPage({ params }: { params: { id: string, tab: string } }) {
  // Extract and format the tab name
  const tabName = params.tab.charAt(0).toUpperCase() + params.tab.slice(1);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="h-[60vh] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-xl bg-card"
    >
      <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-6">
        <FileQuestion className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight mb-2">{tabName} Module</h2>
      <p className="text-muted-foreground max-w-md mx-auto mb-8">
        This section is currently under construction. It will feature detailed {params.tab.toLowerCase()} data for the selected project in a future update.
      </p>
      <Button>Request Early Access</Button>
    </motion.div>
  );
}
