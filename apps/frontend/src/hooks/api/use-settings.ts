import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface Member {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  status: string;
  joinedAt: string;
  lastActive: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

export function useMembers() {
  return useQuery<Member[]>({
    queryKey: ['settings', 'members'],
    queryFn: async () => {
      const res = await apiClient.get('/settings/members');
      return res.data.data ?? res.data;
    },
  });
}

/** Only members who manage the team can list invitations; others skip the request. */
export function useInvitations({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<Invitation[]>({
    queryKey: ['settings', 'invitations'],
    queryFn: async () => {
      const res = await apiClient.get('/settings/invitations');
      return res.data.data ?? res.data;
    },
    enabled,
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const res = await apiClient.post('/settings/invitations', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'invitations'] });
    },
  });
}

export function useChangeMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const res = await apiClient.patch(`/settings/members/${memberId}/role`, { role });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'members'] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const res = await apiClient.delete(`/settings/members/${memberId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'members'] });
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await apiClient.post(`/settings/invitations/${invitationId}/resend`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'invitations'] });
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await apiClient.delete(`/settings/invitations/${invitationId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'invitations'] });
    },
  });
}
export interface OrganizationSettings {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  brandColor: string | null;
  address: string | null;
  gstNumber: string | null;
  currency: string;
  timezone: string;
}

export interface OrganizationSettingsInput {
  name: string;
  address: string | null;
  gstNumber: string | null;
  currency: string;
  timezone: string;
}

const ORGANIZATION_KEY = ['settings', 'organization'] as const;

export function useOrganizationSettings() {
  return useQuery<OrganizationSettings>({
    queryKey: ORGANIZATION_KEY,
    queryFn: async () => {
      const res = await apiClient.get('/settings/organization');
      return res.data.data ?? res.data;
    },
    staleTime: 60_000,
  });
}

function useOrganizationMutation<TVariables>(request: (variables: TVariables) => Promise<OrganizationSettings>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (organization) => queryClient.setQueryData(ORGANIZATION_KEY, organization),
  });
}

export function useUpdateOrganizationSettings() {
  return useOrganizationMutation(async (input: OrganizationSettingsInput) => {
    const res = await apiClient.patch('/settings/organization', input);
    return res.data.data ?? res.data;
  });
}

export function useUploadOrganizationLogo() {
  return useOrganizationMutation(async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await apiClient.post('/settings/organization/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data.data ?? res.data;
  });
}

export function useRemoveOrganizationLogo() {
  return useOrganizationMutation<void>(async () => {
    const res = await apiClient.delete('/settings/organization/logo');
    return res.data.data ?? res.data;
  });
}

export function useUpdateBranding() {
  return useOrganizationMutation(async (brandColor: string | null) => {
    const res = await apiClient.patch('/settings/branding', { brandColor });
    return res.data.data ?? res.data;
  });
}
