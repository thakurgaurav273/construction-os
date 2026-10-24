'use client';

import React from 'react';
import { Skeleton } from '@sitepilot/ui';
import { useProjects } from '@/hooks/api/use-projects';
import { ToggleChip } from './ToggleChip';

interface ProjectPickerProps {
  value: string[];
  onChange: (projectIds: string[]) => void;
  id?: string;
}

/** No selection means every project, which is what most reports want. */
export function ProjectPicker({ value, onChange, id }: ProjectPickerProps): React.ReactElement {
  const { data: projects, isLoading } = useProjects();
  if (isLoading) return <Skeleton className="h-9 w-full rounded-md" />;

  const toggle = (projectId: string): void => {
    onChange(value.includes(projectId) ? value.filter((selected) => selected !== projectId) : [...value, projectId]);
  };

  return (
    <div id={id} className="flex max-h-40 flex-wrap gap-2 overflow-y-auto" role="group" aria-label="Projects">
      <ToggleChip selected={value.length === 0} onClick={() => onChange([])}>All projects</ToggleChip>
      {(projects ?? []).map((project) => (
        <ToggleChip key={project.id} selected={value.includes(project.id)} onClick={() => toggle(project.id)}>{project.name}</ToggleChip>
      ))}
    </div>
  );
}
