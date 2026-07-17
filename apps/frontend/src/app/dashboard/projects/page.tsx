'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Building2, Users, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';

import { Button, Input, Badge, Card, CardContent, Progress, Skeleton } from '@sitepilot/ui';
import { useProjects } from '@/hooks/api/use-projects';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

function statusVariant(status: string) {
  if (status === 'ACTIVE')    return 'default';
  if (status === 'ON_HOLD')   return 'secondary';
  if (status === 'COMPLETED') return 'outline';
  return 'destructive';
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function formatCrore(n: number | null | undefined) {
  if (!n) return '-';
  return `₹${(n / 10_000_000).toFixed(1)} Cr`;
}

export default function ProjectsListPage() {
  const [search, setSearch] = useState('');
  const { data: projects = [], isLoading } = useProjects();

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.clientName ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.location ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground mt-1">
            {isLoading ? 'Loading...' : `${projects.length} project${projects.length !== 1 ? 's' : ''} across your organisation`}
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New Project
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, client, or location..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="w-full sm:w-auto">
          <Filter className="mr-2 h-4 w-4" /> Filters
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No projects found</h3>
          <p className="text-muted-foreground mt-1">
            {search ? 'Try adjusting your search.' : 'Create your first project to get started.'}
          </p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((project) => (
            <motion.div key={project.id} variants={itemVariants}>
              <Link href={`/dashboard/projects/${project.id}`}>
                <Card className="h-full hover:shadow-md transition-all duration-200 group cursor-pointer border-border/50 hover:border-primary/50">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <Badge variant={statusVariant(project.status)} className="capitalize text-xs">
                        {statusLabel(project.status)}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground font-mono mb-1">{project.code}</div>
                    <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>

                    <div className="mt-4 space-y-2 flex-1">
                      {project.clientName && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Users className="mr-2 h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{project.clientName}</span>
                        </div>
                      )}
                      {project.location && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="mr-2 h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{project.location}</span>
                        </div>
                      )}
                      {project.expectedCompletion && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="mr-2 h-3.5 w-3.5 shrink-0" />
                          <span>Due {format(new Date(project.expectedCompletion), 'MMM yyyy')}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-1.5" />
                    </div>

                    <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Spend / Budget</span>
                      <span className="font-medium">{formatCrore(project.spent)} / {formatCrore(project.budget)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
