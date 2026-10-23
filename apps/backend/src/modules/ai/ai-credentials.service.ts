import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AiProvider } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SecretBoxService, keyHint } from '../../common/crypto/secret-box.service';
import { AiProviderError } from './providers/ai-provider';
import { ProviderInfo, ProviderRegistry } from './providers/provider-registry';

export interface CredentialView {
  provider: AiProvider;
  configured: boolean;
  keyHint: string | null;
  model: string;
  lastVerifiedAt: Date | null;
  active: boolean;
}

export interface AiSettingsView {
  providers: (ProviderInfo & { credential: CredentialView })[];
  activeProvider: AiProvider | null;
  encryptionReady: boolean;
}

/**
 * A tenant's own provider keys. A key is tested with a tiny live call before it's saved, stored encrypted, and
 * never returned; the UI only ever sees its last four characters.
 */
@Injectable()
export class AiCredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly secrets: SecretBoxService,
    private readonly providers: ProviderRegistry,
  ) {}

  async settings(organizationId: string): Promise<AiSettingsView> {
    const [credentials, setting] = await Promise.all([
      this.prisma.aiCredential.findMany({ where: { organizationId } }),
      this.prisma.aiOrgSetting.findUnique({ where: { organizationId } }),
    ]);
    return {
      activeProvider: setting?.activeProvider ?? null,
      encryptionReady: this.secrets.isConfigured,
      providers: this.providers.list().map((info) => {
        const credential = credentials.find((row) => row.provider === info.id);
        return {
          ...info,
          credential: {
            provider: info.id,
            configured: !!credential,
            keyHint: credential?.keyHint ?? null,
            model: credential?.model ?? info.defaultModel,
            lastVerifiedAt: credential?.lastVerifiedAt ?? null,
            active: setting?.activeProvider === info.id && !!credential,
          },
        };
      }),
    };
  }

  /** Saves (or replaces) a key after the provider accepts it. The first key saved becomes the active one. */
  async save(organizationId: string, userId: string, provider: AiProvider, apiKey: string, model?: string): Promise<AiSettingsView> {
    const chosenModel = model?.trim() || this.providers.get(provider).defaultModel;
    await verifyProviderKey(this.providers, provider, apiKey.trim(), chosenModel);
    const sealed = { encryptedKey: this.secrets.encrypt(apiKey.trim()), keyHint: keyHint(apiKey), model: chosenModel, lastVerifiedAt: new Date() };

    await this.prisma.$transaction(async (tx) => {
      await tx.aiCredential.upsert({
        where: { organizationId_provider: { organizationId, provider } },
        create: { organizationId, provider, createdById: userId, ...sealed },
        update: sealed,
      });
      const setting = await tx.aiOrgSetting.findUnique({ where: { organizationId } });
      if (!setting?.activeProvider) {
        await tx.aiOrgSetting.upsert({ where: { organizationId }, create: { organizationId, activeProvider: provider }, update: { activeProvider: provider } });
      }
    });
    return this.settings(organizationId);
  }

  /** Changing the model re-tests the stored key against it, so a typo is caught now rather than mid-chat. */
  async updateModel(organizationId: string, provider: AiProvider, model: string): Promise<AiSettingsView> {
    const credential = await this.find(organizationId, provider);
    await verifyProviderKey(this.providers, provider, this.secrets.decrypt(credential.encryptedKey), model.trim());
    await this.prisma.aiCredential.update({ where: { id: credential.id }, data: { model: model.trim(), lastVerifiedAt: new Date() } });
    return this.settings(organizationId);
  }

  async remove(organizationId: string, provider: AiProvider): Promise<AiSettingsView> {
    const credential = await this.find(organizationId, provider);
    await this.prisma.$transaction(async (tx) => {
      await tx.aiCredential.delete({ where: { id: credential.id } });
      const setting = await tx.aiOrgSetting.findUnique({ where: { organizationId } });
      if (setting?.activeProvider === provider) {
        const next = await tx.aiCredential.findFirst({ where: { organizationId }, orderBy: { updatedAt: 'desc' } });
        await tx.aiOrgSetting.update({ where: { organizationId }, data: { activeProvider: next?.provider ?? null } });
      }
    });
    return this.settings(organizationId);
  }

  async select(organizationId: string, provider: AiProvider | null): Promise<AiSettingsView> {
    if (provider) await this.find(organizationId, provider);
    await this.prisma.aiOrgSetting.upsert({
      where: { organizationId },
      create: { organizationId, activeProvider: provider },
      update: { activeProvider: provider },
    });
    return this.settings(organizationId);
  }

  private async find(organizationId: string, provider: AiProvider) {
    const credential = await this.prisma.aiCredential.findUnique({ where: { organizationId_provider: { organizationId, provider } } });
    if (!credential) throw new NotFoundException('No key saved for this provider.');
    return credential;
  }
}

/** A tiny live call: proves the key works and the model exists before anything is stored. */
export async function verifyProviderKey(registry: ProviderRegistry, provider: AiProvider, apiKey: string, model: string): Promise<void> {
  const adapter = registry.get(provider);
  try {
    await adapter.complete(apiKey, { model, maxTokens: 8, messages: [{ role: 'user', content: 'Reply with the single word OK.' }] });
  } catch (error) {
    if (error instanceof AiProviderError) throw new BadRequestException(`Key not saved. ${error.message}`);
    throw error;
  }
}
