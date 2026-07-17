import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface Project {
  id: string;
  name: string;
  code: string;
  description: string | null;
  clientName: string | null;
  location: string | null;
  status: string;
  priority: string;
  progress: number;
  budget: number | null;
  spent: number;
  startDate: string | null;
  expectedCompletion: string | null;
  memberCount: number;
}

export interface AvailableMember {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  orgRole: string;
}

export interface CreateProjectInput {
  name: string;
  code: string;
  description?: string;
  clientName?: string;
  location?: string;
  status?: string;
  priority?: string;
  budget?: number;
  progress?: number;
  startDate?: string;
  expectedCompletion?: string;
}

export type UpdateProjectInput = Partial<CreateProjectInput> & { spent?: number };

export interface AddMemberInput {
  userId: string;
  role?: string;
}

export interface ProjectDetail extends Project {
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

export function useProjectAvailableMembers(id: string, enabled = true) {
  return useQuery<AvailableMember[]>({
    queryKey: ['project', id, 'available-members'],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${id}/available-members`);
      return res.data.data ?? res.data;
    },
    enabled: !!id && enabled,
    staleTime: 30_000,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateProjectInput) => {
      const res = await apiClient.post('/projects', data);
      return res.data.data ?? res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProjectInput }) => {
      const res = await apiClient.patch(`/projects/${id}`, data);
      return res.data.data ?? res.data;
    },
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['project', variables.id] });
    },
  });
}

export function useAddProjectMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AddMemberInput }) => {
      const res = await apiClient.post(`/projects/${id}/members`, data);
      return res.data.data ?? res.data;
    },
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['project', variables.id] });
    },
  });
}
