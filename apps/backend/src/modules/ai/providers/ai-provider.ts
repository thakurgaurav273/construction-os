import { AiProvider } from '@prisma/client';

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiCompletionRequest {
  model: string;
  messages: AiMessage[];
  maxTokens: number;
  temperature?: number;
}

export interface AiCompletion {
  text: string;
  promptTokens: number | null;
  completionTokens: number | null;
}

export type AiProviderErrorCode = 'INVALID_KEY' | 'RATE_LIMITED' | 'MODEL_NOT_FOUND' | 'REJECTED' | 'UNAVAILABLE';

/** A provider failure in words a tenant admin can act on. Never contains the key. */
export class AiProviderError extends Error {
  constructor(
    readonly code: AiProviderErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/**
 * One adapter per provider. Features never talk to a provider directly; they go through AiService,
 * which picks the adapter and key. Adding a provider (e.g. OpenAI) means one new adapter and an enum value.
 */
export interface AiProviderAdapter {
  readonly id: AiProvider;
  readonly label: string;
  readonly defaultModel: string;
  readonly suggestedModels: readonly string[];
  /** Where an admin creates a key for this provider. */
  readonly keyUrl: string;
  complete(apiKey: string, request: AiCompletionRequest): Promise<AiCompletion>;
}

export const PROVIDER_TIMEOUT_MS = 45_000;

/** Maps an HTTP failure to a code and a message safe to show. */
export function providerError(provider: string, status: number, detail: string): AiProviderError {
  const hint = detail ? `: ${detail.slice(0, 200)}` : '';
  if (status === 401 || status === 403) return new AiProviderError('INVALID_KEY', `${provider} rejected the API key${hint}`);
  if (status === 429) return new AiProviderError('RATE_LIMITED', `${provider} rate limit or quota reached. Try again shortly${hint}`);
  if (status === 404) return new AiProviderError('MODEL_NOT_FOUND', `${provider} doesn't offer that model to this key${hint}`);
  if (status >= 500) return new AiProviderError('UNAVAILABLE', `${provider} is unavailable right now (HTTP ${status}).`);
  return new AiProviderError('REJECTED', `${provider} rejected the request${hint}`);
}

export function networkError(provider: string, error: unknown): AiProviderError {
  const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
  return new AiProviderError('UNAVAILABLE', timedOut ? `${provider} took too long to answer.` : `Couldn't reach ${provider}.`);
}

/** Pulls a short, key-free reason out of a provider error body. */
export async function readErrorDetail(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    const error = (body as { error?: { message?: unknown } | unknown })?.error;
    if (typeof error === 'string') return error;
    const message = (error as { message?: unknown } | undefined)?.message;
    return typeof message === 'string' ? message : '';
  } catch {
    return '';
  }
}
