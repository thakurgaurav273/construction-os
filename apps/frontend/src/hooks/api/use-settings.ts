import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Permission } from '@sitepilot/types';
import { apiClient } from '@/lib/api/client';

export interface Member {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: string;
  status: string;
  joinedAt: string;
  /** Last sign-in or session refresh; null if unknown. */
  lastActive: string | null;
  /** Their access differs from their role's. */
  hasCustomPermissions: boolean;
}

export interface RoleCatalogue {
  permissions: { key: Permission; group: string; label: string }[];
  /** `permissions` include this organization's changes; `defaults` are the product's. */
  roles: { role: string; permissions: Permission[]; defaults: Permission[]; customized: boolean }[];
}

export interface MemberPermissions {
  userId: string;
  role: string;
  rolePermissions: Permission[];
  permissions: Permission[];
  granted: Permission[];
  revoked: Permission[];
}

export type IntegrationState = 'connected' | 'development' | 'not_configured';

export interface Integration {
  id: 'email' | 'storage';
  name: string;
  provider: string | null;
  state: IntegrationState;
  detail: string;
  /** Saved in the app by a platform admin, or set in the server environment. */
  source: 'app' | 'server';
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

/** What each role can do. Fixed by the product, so it is cached for the session. */
export function useRoleCatalogue() {
  return useQuery<RoleCatalogue>({
    queryKey: ['settings', 'roles'],
    queryFn: async () => {
      const res = await apiClient.get('/settings/roles');
      return res.data.data ?? res.data;
    },
    staleTime: 60_000,
  });
}

/** Changing access can change what anyone (including people on other devices) may do, so refetch it all. */
function invalidateAccess(queryClient: ReturnType<typeof useQueryClient>): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['settings', 'roles'] }),
    queryClient.invalidateQueries({ queryKey: ['settings', 'members'] }),
    queryClient.invalidateQueries({ queryKey: ['auth', 'access'] }),
  ]);
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ role, permissions }: { role: string; permissions: Permission[] }) =>
      (await apiClient.put(`/settings/roles/${role}/permissions`, { permissions })).data,
    onSuccess: () => invalidateAccess(queryClient),
  });
}

/** One member's access; only people who manage roles can read it. */
export function useMemberPermissions(userId: string | null) {
  return useQuery<MemberPermissions>({
    queryKey: ['settings', 'members', userId, 'permissions'],
    queryFn: async () => {
      const res = await apiClient.get(`/settings/members/${userId}/permissions`);
      return res.data.data ?? res.data;
    },
    enabled: !!userId,
  });
}

export function useUpdateMemberPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, permissions }: { userId: string; permissions: Permission[] }) =>
      (await apiClient.put(`/settings/members/${userId}/permissions`, { permissions })).data,
    onSuccess: () => invalidateAccess(queryClient),
  });
}

/** Server-side services (email, storage). Only people who manage the organization can read them. */
export function useIntegrations({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<Integration[]>({
    queryKey: ['settings', 'integrations'],
    queryFn: async () => {
      const res = await apiClient.get('/settings/integrations');
      return res.data.data ?? res.data;
    },
    enabled,
    staleTime: 5 * 60_000,
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
