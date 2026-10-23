import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  archivedAt: string | null;
  memberCount: number;
}

/** Lightweight project for pickers and filters; archived projects are never offered. */
export interface ProjectOption {
  id: string;
  name: string;
  code: string;
  status: string;
  progress: number;
  location: string | null;
}

export interface ProjectListFilters {
  search?: string;
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

export interface ProjectPage {
  items: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ProjectMemberRole = 'MANAGER' | 'ENGINEER' | 'VIEWER';

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

/** Every project that can take new work, for pickers and filters. */
export function useProjects() {
  return useQuery<ProjectOption[]>({
    queryKey: ['projects', 'options'],
    queryFn: async () => {
      const res = await apiClient.get('/projects/options');
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}

/** The paginated projects list, filtered on the server. */
export function useProjectList(filters: ProjectListFilters) {
  return useQuery<ProjectPage>({
    queryKey: ['projects', 'list', filters],
    queryFn: async () => {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''));
      const res = await apiClient.get('/projects', { params });
      return res.data.data ?? res.data;
    },
    placeholderData: keepPreviousData,
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

function useProjectMutation<TVariables extends { id: string }>(request: (variables: TVariables) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['project', variables.id] });
    },
  });
}

export function useArchiveProject() {
  return useProjectMutation(({ id }: { id: string }) => apiClient.post(`/projects/${id}/archive`));
}

export function useRestoreProject() {
  return useProjectMutation(({ id }: { id: string }) => apiClient.post(`/projects/${id}/restore`));
}

export function useDeleteProject() {
  return useProjectMutation(({ id }: { id: string }) => apiClient.delete(`/projects/${id}`));
}

export function useChangeProjectMemberRole() {
  return useProjectMutation(({ id, userId, role }: { id: string; userId: string; role: ProjectMemberRole }) =>
    apiClient.patch(`/projects/${id}/members/${userId}`, { role }));
}

export function useRemoveProjectMember() {
  return useProjectMutation(({ id, userId }: { id: string; userId: string }) =>
    apiClient.delete(`/projects/${id}/members/${userId}`));
}
