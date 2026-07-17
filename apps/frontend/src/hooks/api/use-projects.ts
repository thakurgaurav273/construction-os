import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface Project {
  id: string;
  name: string;
  code: string;
  clientName: string | null;
  location: string | null;
  status: string;
  priority: string;
  progress: number;
  budget: number | null;
  spent: number;
  expectedCompletion: string | null;
  memberCount: number;
}

export interface ProjectDetail extends Project {
  description: string | null;
  startDate: string | null;
  members: {
    id: string;
    role: string;
    user: { id: string; name: string; email: string; avatar: string | null };
  }[];
  activities: {
    id: string;
    type: string;
    title: string;
    description: string | null;
    createdAt: string;
    actor: { id: string; name: string; avatar: string | null };
  }[];
}

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiClient.get('/projects');
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}

export function useProject(id: string) {
  return useQuery<ProjectDetail>({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${id}`);
      return res.data.data ?? res.data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}
