'use client';

import React from 'react';
import { Package } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';

export default function MaterialsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Materials</h2>
        <p className="text-muted-foreground">Material tracking and consumption for this project.</p>
      </div>

      <EmptyState
        icon={Package}
        title="No data available yet"
        description="Material tracking will appear here once the Materials module is connected to the backend."
      />
    </div>
  );
}
