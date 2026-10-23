import { AiProvider } from '@prisma/client';
import {
  AiCompletion, AiCompletionRequest, AiProviderAdapter, AiProviderError, PROVIDER_TIMEOUT_MS,
  networkError, providerError, readErrorDetail,
} from './ai-provider';

interface GenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

/** Google Gemini through the Generative Language API. The key goes in a header so it never appears in URLs or logs. */
export class GeminiProvider implements AiProviderAdapter {
  readonly id = AiProvider.GEMINI;
  readonly label = 'Google Gemini';
  readonly keyUrl = 'https://aistudio.google.com/app/apikey';
  readonly suggestedModels = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'] as const;

  constructor(
    private readonly baseUrl: string,
    readonly defaultModel: string,
  ) {}

  async complete(apiKey: string, request: AiCompletionRequest): Promise<AiCompletion> {
    const system = request.messages.filter((message) => message.role === 'system').map((message) => message.content).join('\n\n');
    const contents = request.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] }));

    let response: Response;
    try {
      response = await fetch(
        `${this.baseUrl.replace(/\/$/, '')}/v1beta/models/${encodeURIComponent(request.model)}:generateContent`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            ...(system && { systemInstruction: { parts: [{ text: system }] } }),
            contents,
            generationConfig: { maxOutputTokens: request.maxTokens, temperature: request.temperature ?? 0.3 },
          }),
          signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
        },
      );
    } catch (error) {
      throw networkError(this.label, error);
    }
    if (!response.ok) {
      const detail = await readErrorDetail(response);
      // Gemini answers an invalid key with 400 "API key not valid".
      if (response.status === 400 && /api key/i.test(detail)) throw providerError(this.label, 401, detail);
      throw providerError(this.label, response.status, detail);
    }

    const body = (await response.json()) as GenerateContentResponse;
    if (body.promptFeedback?.blockReason) {
      throw new AiProviderError('REJECTED', `${this.label} declined to answer (${body.promptFeedback.blockReason}).`);
    }
    const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim();
    if (!text) throw new AiProviderError('REJECTED', `${this.label} returned an empty answer.`);
    return {
      text,
      promptTokens: body.usageMetadata?.promptTokenCount ?? null,
      completionTokens: body.usageMetadata?.candidatesTokenCount ?? null,
    };
  }
}
