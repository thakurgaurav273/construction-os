import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Briefcase, Clock, Users } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Progress } from '@sitepilot/ui';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCrore } from '../format';
import type { DashboardProject } from '../types';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = { ACTIVE: 'default', PLANNING: 'secondary' };

export function ProjectOverview({ projects, totalProjects }: { projects: DashboardProject[]; totalProjects: number }): React.ReactElement {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle>Project overview</CardTitle>
          <CardDescription>Progress and spend on your live sites.</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild><Link href="/dashboard/projects">View all {totalProjects}</Link></Button>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No live projects"
            description="Create a project, or move one to Active, to track its progress here."
            action={<Button asChild><Link href="/dashboard/projects">Go to Projects</Link></Button>}
          />
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="flex flex-col justify-between gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate font-semibold">{project.name}</h4>
                    <Badge variant={STATUS_VARIANTS[project.status] ?? 'outline'} className="h-5 text-xs capitalize">{project.status.replace('_', ' ').toLowerCase()}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center"><Users className="mr-1 h-3 w-3" />{project.memberCount} members</span>
                    {project.expectedCompletion && (
                      <span className="flex items-center"><Clock className="mr-1 h-3 w-3" />Due {format(new Date(project.expectedCompletion), 'MMM yyyy')}</span>
                    )}
                  </div>
                </div>
                <div className="w-full space-y-1 sm:w-1/3">
                  <div className="flex justify-between text-sm"><span>Progress</span><span className="font-medium">{project.progress}%</span></div>
                  <Progress value={project.progress} className="h-2" />
                </div>
                <div className="hidden space-y-0.5 text-right sm:block">
                  <div className="text-xs text-muted-foreground">Spent / Budget</div>
                  <div className="text-sm font-medium">{formatCrore(project.spent)} / {formatCrore(project.budget)}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
