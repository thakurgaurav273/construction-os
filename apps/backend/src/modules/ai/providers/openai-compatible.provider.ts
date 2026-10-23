import { AiProvider } from '@prisma/client';
import {
  AiCompletion, AiCompletionRequest, AiProviderAdapter, AiProviderError, PROVIDER_TIMEOUT_MS,
  networkError, providerError, readErrorDetail,
} from './ai-provider';

interface ChatCompletionResponse {
  choices?: { message?: { content?: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/** Providers that speak the OpenAI chat-completions protocol: Groq, Hugging Face's router, and later OpenAI itself. */
export abstract class OpenAiCompatibleProvider implements AiProviderAdapter {
  abstract readonly id: AiProvider;
  abstract readonly label: string;
  abstract readonly defaultModel: string;
  abstract readonly suggestedModels: readonly string[];
  abstract readonly keyUrl: string;
  protected abstract readonly baseUrl: string;

  async complete(apiKey: string, request: AiCompletionRequest): Promise<AiCompletion> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          max_tokens: request.maxTokens,
          temperature: request.temperature ?? 0.3,
        }),
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      });
    } catch (error) {
      throw networkError(this.label, error);
    }
    if (!response.ok) throw providerError(this.label, response.status, await readErrorDetail(response));

    const body = (await response.json()) as ChatCompletionResponse;
    const text = body.choices?.[0]?.message?.content?.trim();
    if (!text) throw new AiProviderError('REJECTED', `${this.label} returned an empty answer.`);
    return {
      text,
      promptTokens: body.usage?.prompt_tokens ?? null,
      completionTokens: body.usage?.completion_tokens ?? null,
    };
  }
}

export class GroqProvider extends OpenAiCompatibleProvider {
  readonly id = AiProvider.GROQ;
  readonly label = 'Groq';
  readonly keyUrl = 'https://console.groq.com/keys';
  readonly suggestedModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-120b'] as const;

  constructor(
    protected readonly baseUrl: string,
    readonly defaultModel: string,
  ) {
    super();
  }
}

export class HuggingFaceProvider extends OpenAiCompatibleProvider {
  readonly id = AiProvider.HUGGINGFACE;
  readonly label = 'Hugging Face';
  readonly keyUrl = 'https://huggingface.co/settings/tokens';
  readonly suggestedModels = ['meta-llama/Llama-3.1-8B-Instruct', 'Qwen/Qwen2.5-72B-Instruct', 'mistralai/Mistral-7B-Instruct-v0.3'] as const;

  constructor(
    protected readonly baseUrl: string,
    readonly defaultModel: string,
  ) {
    super();
  }
}
