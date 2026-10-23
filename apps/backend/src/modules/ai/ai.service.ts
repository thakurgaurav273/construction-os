import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { AiKeySource, AiProvider } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AiAccessService } from './ai-access.service';
import { AiMessage, AiProviderError } from './providers/ai-provider';
import { ProviderRegistry } from './providers/provider-registry';

export type AiFeature = 'project_chat' | 'org_chat' | 'daily_report_summary' | 'insights' | 'import_mapping' | 'report_summary';

export interface AiCallContext {
  organizationId: string;
  userId: string;
  feature: AiFeature;
}

export interface AiCallRequest {
  system: string;
  messages: AiMessage[];
  maxTokens: number;
  temperature?: number;
}

export interface AiAnswer {
  text: string;
  provider: AiProvider;
  model: string;
  source: AiKeySource;
}

/**
 * The one entry point for model calls. Features describe what they want; this picks the key (tenant's own or
 * platform allowance), calls the provider through its adapter and records usage. Features never see a key.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AiAccessService,
    private readonly providers: ProviderRegistry,
  ) {}

  async complete(context: AiCallContext, request: AiCallRequest): Promise<AiAnswer> {
    const access = await this.access.resolve(context.organizationId);
    const adapter = this.providers.get(access.provider);
    const started = Date.now();
    try {
      const completion = await adapter.complete(access.apiKey, {
        model: access.model,
        messages: [{ role: 'system', content: request.system }, ...request.messages],
        maxTokens: request.maxTokens,
        temperature: request.temperature,
      });
      await this.recordUsage(context, access, { success: true, latencyMs: Date.now() - started, ...completion });
      return { text: completion.text, provider: access.provider, model: access.model, source: access.source };
    } catch (error) {
      const code = error instanceof AiProviderError ? error.code : 'UNAVAILABLE';
      await this.recordUsage(context, access, { success: false, errorCode: code, latencyMs: Date.now() - started });
      if (!(error instanceof AiProviderError)) this.logger.error('AI call failed', error instanceof Error ? error.stack : undefined);
      throw new BadGatewayException(this.explain(access.source, error));
    }
  }

  /** A tenant can fix its own key; platform problems are ours, so their details stay internal. */
  private explain(source: AiKeySource, error: unknown): string {
    if (!(error instanceof AiProviderError)) return 'The AI service failed unexpectedly. Try again.';
    if (source === AiKeySource.PLATFORM) {
      this.logger.warn(`Platform AI key failed: ${error.code} ${error.message}`);
      return error.code === 'RATE_LIMITED'
        ? 'The AI service is busy. Try again in a minute.'
        : 'The AI service is temporarily unavailable. Try again later.';
    }
    const fix = error.code === 'INVALID_KEY' || error.code === 'MODEL_NOT_FOUND' ? ' An admin can update it in Settings → AI.' : '';
    return `${error.message}${fix}`;
  }

  private async recordUsage(
    context: AiCallContext,
    access: { provider: AiProvider; model: string; source: AiKeySource },
    result: { success: boolean; errorCode?: string; latencyMs: number; promptTokens?: number | null; completionTokens?: number | null },
  ): Promise<void> {
    await this.prisma.aiUsage.create({
      data: {
        organizationId: context.organizationId,
        userId: context.userId,
        feature: context.feature,
        provider: access.provider,
        model: access.model,
        source: access.source,
        success: result.success,
        errorCode: result.errorCode ?? null,
        promptTokens: result.promptTokens ?? null,
        completionTokens: result.completionTokens ?? null,
        latencyMs: result.latencyMs,
      },
    }).catch((error: unknown) => {
      this.logger.error('Failed to record AI usage', error instanceof Error ? error.stack : undefined);
    });
  }
}
