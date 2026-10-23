import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export type AiProviderId = 'GEMINI' | 'GROQ' | 'HUGGINGFACE';
export type AiAccessMode = 'OWN_KEY' | 'PLATFORM' | 'NONE';

export interface AiAllowance {
  granted: number;
  used: number;
  remaining: number;
  expiresAt: string | null;
  active: boolean;
}

export interface AiStatus {
  mode: AiAccessMode;
  provider: AiProviderId | null;
  model: string | null;
  allowance: AiAllowance;
  blockedReason: string | null;
}

export interface AiProviderCard {
  id: AiProviderId;
  label: string;
  defaultModel: string;
  suggestedModels: string[];
  keyUrl: string;
  credential: { configured: boolean; keyHint: string | null; model: string; lastVerifiedAt: string | null; active: boolean };
}

export interface AiAccessRequest {
  id: string;
  organizationId: string;
  organizationName: string;
  kind: 'TRIAL' | 'TOP_UP';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  requestedRequests: number;
  reason: string | null;
  requestedBy: { id: string; name: string; email: string };
  createdAt: string;
  decidedByEmail: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  grantedRequests: number | null;
  expiresAt: string | null;
}

export interface AiSettings {
  providers: AiProviderCard[];
  activeProvider: AiProviderId | null;
  encryptionReady: boolean;
  status: AiStatus;
  requests: AiAccessRequest[];
  trialDefaults: { requests: number; days: number };
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatAnswer {
  answer: string;
  provider: string;
  model: string;
}

export interface AiInsight {
  title: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
  area: string;
  project: string | null;
}

export interface AiInsightSnapshot {
  insights: AiInsight[];
  generatedAt: string;
  provider: string;
  model: string;
}

const AI_KEY = ['ai'] as const;

const unwrap = <T,>(res: { data: { data?: T } & T }): T => (res.data.data ?? res.data) as T;

export function useAiStatus() {
  return useQuery<AiStatus>({
    queryKey: [...AI_KEY, 'status'],
    queryFn: async () => unwrap<AiStatus>(await apiClient.get('/ai/status')),
    staleTime: 30_000,
  });
}

export function useAiSettings(enabled = true) {
  return useQuery<AiSettings>({
    queryKey: [...AI_KEY, 'settings'],
    queryFn: async () => unwrap<AiSettings>(await apiClient.get('/ai/settings')),
    enabled,
  });
}

/** Every settings change affects what the AI status says, so refresh both. */
function useAiSettingsMutation<TVariables>(request: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AI_KEY }),
  });
}

export function useSaveAiKey() {
  return useAiSettingsMutation(({ provider, apiKey, model }: { provider: AiProviderId; apiKey: string; model?: string }) =>
    apiClient.put(`/ai/credentials/${provider}`, { apiKey, model: model || undefined }));
}

export function useUpdateAiModel() {
  return useAiSettingsMutation(({ provider, model }: { provider: AiProviderId; model: string }) =>
    apiClient.patch(`/ai/credentials/${provider}`, { model }));
}

export function useRemoveAiKey() {
  return useAiSettingsMutation((provider: AiProviderId) => apiClient.delete(`/ai/credentials/${provider}`));
}

export function useSelectAiProvider() {
  return useAiSettingsMutation((provider: AiProviderId | null) => apiClient.put('/ai/provider', { provider }));
}

export function useRequestAiAccess() {
  return useAiSettingsMutation((input: { kind: 'TRIAL' | 'TOP_UP'; requestedRequests?: number; reason?: string }) =>
    apiClient.post('/ai/access-requests', input));
}

export function useCancelAiAccessRequest() {
  return useAiSettingsMutation((id: string) => apiClient.post(`/ai/access-requests/${id}/cancel`));
}

/** One chat turn. `projectId` scopes the answer to a project; without it the whole organization is in scope. */
export function useAiChat(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messages: ChatTurn[]): Promise<ChatAnswer> =>
      unwrap<ChatAnswer>(await apiClient.post(projectId ? `/ai/projects/${projectId}/chat` : '/ai/chat', { messages })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...AI_KEY, 'status'] }),
  });
}

export function useSummarizeDailyReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, reportId }: { projectId: string; reportId: string }) =>
      unwrap<ChatAnswer & { aiSummary: string }>(await apiClient.post(`/ai/projects/${projectId}/daily-reports/${reportId}/summary`)),
    onSuccess: (_result, { projectId, reportId }) => {
      queryClient.invalidateQueries({ queryKey: ['daily-report', projectId, reportId] });
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] });
      queryClient.invalidateQueries({ queryKey: [...AI_KEY, 'status'] });
    },
  });
}

export function useAiInsights() {
  return useQuery<AiInsightSnapshot | null>({
    queryKey: [...AI_KEY, 'insights'],
    // `data` is null until the first snapshot exists; unwrap would fall back to the whole envelope.
    queryFn: async () => {
      const response = await apiClient.get<{ data: AiInsightSnapshot | null }>('/ai/insights');
      return response.data.data ?? null;
    },
    staleTime: 60_000,
  });
}

export function useRefreshAiInsights() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap<AiInsightSnapshot>(await apiClient.post('/ai/insights/refresh')),
    onSuccess: (snapshot) => {
      queryClient.setQueryData([...AI_KEY, 'insights'], snapshot);
      queryClient.invalidateQueries({ queryKey: [...AI_KEY, 'status'] });
    },
  });
}
