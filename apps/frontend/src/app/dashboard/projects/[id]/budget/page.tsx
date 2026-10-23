'use client';

import React from 'react';
import { ProjectBudgetTab } from '@/features/finance/components/budget/ProjectBudgetTab';

export default function ProjectBudgetPage({ params }: { params: { id: string } }): React.ReactElement {
  return <ProjectBudgetTab projectId={params.id} />;
}
