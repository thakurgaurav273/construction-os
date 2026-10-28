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

/** Email or storage settings saved in the app. Secrets come back only as `secretHint`. */
export interface PlatformIntegrationRecord {
  kind: 'STORAGE' | 'EMAIL';
  provider: string;
  settings: Record<string, string>;
  secretHint: string;
  lastVerifiedAt: string;
  updatedByEmail: string;
  updatedAt: string;
}

export interface PlatformIntegrations {
  storage: PlatformIntegrationRecord | null;
  email: PlatformIntegrationRecord | null;
  canSave: boolean;
}

export interface StorageIntegrationInput {
  provider: 's3' | 'r2';
  bucket: string;
  region?: string;
  endpoint?: string;
  accountId?: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface EmailIntegrationInput {
  apiKey: string;
  fromAddress: string;
}

const INTEGRATIONS_KEY = [...PLATFORM_KEY, 'integrations'] as const;

/** Platform admins only; everyone else reads the status through useIntegrations. */
export function usePlatformIntegrations({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<PlatformIntegrations>({
    queryKey: INTEGRATIONS_KEY,
    queryFn: async () => unwrap(await apiClient.get('/platform/integrations')),
    enabled,
  });
}

function useIntegrationMutation<TVariables>(request: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: INTEGRATIONS_KEY }),
      queryClient.invalidateQueries({ queryKey: ['settings', 'integrations'] }),
    ]),
  });
}

export function useSaveStorageIntegration() {
  return useIntegrationMutation((input: StorageIntegrationInput) => apiClient.put('/platform/integrations/storage', input));
}

export function useSaveEmailIntegration() {
  return useIntegrationMutation((input: EmailIntegrationInput) => apiClient.put('/platform/integrations/email', input));
}

export function useRemoveIntegration() {
  return useIntegrationMutation((kind: 'storage' | 'email') => apiClient.delete(`/platform/integrations/${kind}`));
}
