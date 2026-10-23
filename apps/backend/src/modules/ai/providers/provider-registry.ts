import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from '@prisma/client';
import { AiProviderAdapter } from './ai-provider';
import { GeminiProvider } from './gemini.provider';
import { GroqProvider, HuggingFaceProvider } from './openai-compatible.provider';

export interface ProviderInfo {
  id: AiProvider;
  label: string;
  defaultModel: string;
  suggestedModels: readonly string[];
  keyUrl: string;
}

/**
 * The single place that knows which providers exist. Base URLs and default models can be overridden by env
 * (proxies, regional endpoints, tests) without touching feature code.
 */
@Injectable()
export class ProviderRegistry {
  private readonly adapters: Map<AiProvider, AiProviderAdapter>;

  constructor(config: ConfigService) {
    const get = (name: string, fallback: string): string => config.get<string>(name)?.trim() || fallback;
    const adapters: AiProviderAdapter[] = [
      new GeminiProvider(get('AI_GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com'), get('AI_GEMINI_MODEL', 'gemini-2.5-flash')),
      new GroqProvider(get('AI_GROQ_BASE_URL', 'https://api.groq.com/openai/v1'), get('AI_GROQ_MODEL', 'llama-3.3-70b-versatile')),
      new HuggingFaceProvider(
        get('AI_HUGGINGFACE_BASE_URL', 'https://router.huggingface.co/v1'),
        get('AI_HUGGINGFACE_MODEL', 'meta-llama/Llama-3.1-8B-Instruct'),
      ),
    ];
    this.adapters = new Map(adapters.map((adapter) => [adapter.id, adapter]));
  }

  get(provider: AiProvider): AiProviderAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new Error(`No adapter for AI provider ${provider}`);
    return adapter;
  }

  list(): ProviderInfo[] {
    return [...this.adapters.values()].map(({ id, label, defaultModel, suggestedModels, keyUrl }) => ({
      id, label, defaultModel, suggestedModels, keyUrl,
    }));
  }
}
