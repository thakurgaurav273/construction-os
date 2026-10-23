import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { AiAccessRequest, AiAllowance, AiProviderId } from './use-ai';

export interface PlatformTenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  memberCount: number;
  projectCount: number;
  aiMode: 'OWN_KEY' | 'PLATFORM' | 'NONE';
  allowance: AiAllowance;
  aiCallsLast30Days: number;
}

export interface PlatformProvider {
  id: AiProviderId;
  label: string;
  defaultModel: string;
  suggestedModels: string[];
  keyUrl: string;
  configured: boolean;
  keyHint: string | null;
  model: string;
  isDefault: boolean;
  lastVerifiedAt: string | null;
}

const PLATFORM_KEY = ['platform'] as const;
const unwrap = <T,>(res: { data: { data?: T } & T }): T => (res.data.data ?? res.data) as T;

export function usePlatformRequests(status?: AiAccessRequest['status']) {
  return useQuery<AiAccessRequest[]>({
    queryKey: [...PLATFORM_KEY, 'requests', status ?? 'all'],
    queryFn: async () => unwrap<AiAccessRequest[]>(await apiClient.get('/platform/ai/requests', { params: status ? { status } : {} })),
  });
}

export function usePlatformTenants() {
  return useQuery<PlatformTenant[]>({
    queryKey: [...PLATFORM_KEY, 'tenants'],
    queryFn: async () => unwrap<PlatformTenant[]>(await apiClient.get('/platform/tenants')),
  });
}

export function usePlatformProviders() {
  return useQuery<{ providers: PlatformProvider[]; encryptionReady: boolean }>({
    queryKey: [...PLATFORM_KEY, 'providers'],
    queryFn: async () => unwrap<{ providers: PlatformProvider[]; encryptionReady: boolean }>(await apiClient.get('/platform/ai/providers')),
  });
}

export function usePlatformUsage() {
  return useQuery<{ day: string; calls: number; failures: number }[]>({
    queryKey: [...PLATFORM_KEY, 'usage'],
    queryFn: async () => unwrap<{ day: string; calls: number; failures: number }[]>(await apiClient.get('/platform/ai/usage')),
  });
}

function usePlatformMutation<TVariables>(request: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: request, onSuccess: () => queryClient.invalidateQueries({ queryKey: PLATFORM_KEY }) });
}

export function useApproveAiRequest() {
  return usePlatformMutation(({ id, grantedRequests, days, note }: { id: string; grantedRequests: number; days: number; note?: string }) =>
    apiClient.post(`/platform/ai/requests/${id}/approve`, { grantedRequests, days, note: note || undefined }));
}

export function useRejectAiRequest() {
  return usePlatformMutation(({ id, note }: { id: string; note: string }) => apiClient.post(`/platform/ai/requests/${id}/reject`, { note }));
}

export function useSavePlatformKey() {
  return usePlatformMutation(({ provider, apiKey, model }: { provider: AiProviderId; apiKey: string; model?: string }) =>
    apiClient.put(`/platform/ai/providers/${provider}`, { apiKey, model: model || undefined }));
}

export function useMakePlatformDefault() {
  return usePlatformMutation((provider: AiProviderId) => apiClient.post(`/platform/ai/providers/${provider}/default`));
}

export function useRemovePlatformKey() {
  return usePlatformMutation((provider: AiProviderId) => apiClient.delete(`/platform/ai/providers/${provider}`));
}
