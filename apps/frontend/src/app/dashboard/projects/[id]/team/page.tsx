'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Mail, Users } from 'lucide-react';
import { Card, CardContent, Button, Skeleton } from '@sitepilot/ui';
import { useProject } from '@/hooks/api/use-projects';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { EmptyState } from '@/components/shared/EmptyState';
import { AddMemberDialog } from '../../components/AddMemberDialog';
import { useCan } from '@/hooks/api/use-access';
import { ProjectMemberMenu } from '../../components/ProjectMemberMenu';

function roleLabel(role: string): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export default function ProjectTeamPage({ params }: { params: { id: string } }) {
  const { data: project, isLoading, isError, refetch } = useProject(params.id);
  const [addOpen, setAddOpen] = useState(false);
  const members = project?.members ?? [];
  const isArchived = project?.status === 'ARCHIVED';
  const canManage = useCan()('project.members.manage') && !isArchived;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold tracking-tight">Project Team</h3>
        {canManage && <Button onClick={() => setAddOpen(true)}>Add Member</Button>}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-full">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load the project team"
          description="Check your connection and try again."
          action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
        />
      ) : members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members yet"
          description="Assign engineers, managers, and viewers to this project to see them here."
          action={canManage ? <Button onClick={() => setAddOpen(true)}>Add Member</Button> : undefined}
        />
      ) : (
        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {members.map((member, i) => (
            <motion.div
              key={member.id}
              initial={false}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <UserAvatar name={member.user.name} avatar={member.user.avatar} className="mb-4 h-16 w-16" fallbackClassName="text-xl" />
                    {canManage && <ProjectMemberMenu projectId={params.id} member={member} />}
                  </div>
                  <h4 className="font-semibold text-lg">{member.user.name}</h4>
                  <p className="text-sm text-primary mb-4 font-medium">{roleLabel(member.role)}</p>

                  <div className="space-y-2 pt-4 border-t border-border/50">
                    <a
                      href={`mailto:${member.user.email}`}
                      className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Mail className="mr-2 h-4 w-4" /> {member.user.email}
                    </a>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      <AddMemberDialog projectId={params.id} open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
