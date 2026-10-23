import { Injectable, NotFoundException } from '@nestjs/common';
import { AiKeySource, AiProvider } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SecretBoxService, keyHint } from '../../common/crypto/secret-box.service';
import { ProviderInfo, ProviderRegistry } from './providers/provider-registry';
import { verifyProviderKey } from './ai-credentials.service';
import { AiAccessService, PlatformAllowance } from './ai-access.service';

export interface PlatformProviderView extends ProviderInfo {
  configured: boolean;
  keyHint: string | null;
  model: string;
  isDefault: boolean;
  lastVerifiedAt: Date | null;
}

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  memberCount: number;
  projectCount: number;
  aiMode: 'OWN_KEY' | 'PLATFORM' | 'NONE';
  allowance: PlatformAllowance;
  aiCallsLast30Days: number;
}

/** Everything the platform console needs: the platform's own keys and a view across all tenants. */
@Injectable()
export class PlatformAiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly secrets: SecretBoxService,
    private readonly providers: ProviderRegistry,
    private readonly access: AiAccessService,
  ) {}

  async providersView(): Promise<{ providers: PlatformProviderView[]; encryptionReady: boolean }> {
    const rows = await this.prisma.platformAiCredential.findMany();
    return {
      encryptionReady: this.secrets.isConfigured,
      providers: this.providers.list().map((info) => {
        const row = rows.find((credential) => credential.provider === info.id);
        return {
          ...info,
          configured: !!row,
          keyHint: row?.keyHint ?? null,
          model: row?.model ?? info.defaultModel,
          isDefault: row?.isDefault ?? false,
          lastVerifiedAt: row?.lastVerifiedAt ?? null,
        };
      }),
    };
  }

  /** The first platform key saved becomes the default used for trials. */
  async saveKey(provider: AiProvider, apiKey: string, model: string | undefined, adminEmail: string) {
    const chosenModel = model?.trim() || this.providers.get(provider).defaultModel;
    await verifyProviderKey(this.providers, provider, apiKey.trim(), chosenModel);
    const hasDefault = (await this.prisma.platformAiCredential.count({ where: { isDefault: true } })) > 0;
    const sealed = {
      encryptedKey: this.secrets.encrypt(apiKey.trim()),
      keyHint: keyHint(apiKey),
      model: chosenModel,
      lastVerifiedAt: new Date(),
      updatedByEmail: adminEmail,
    };
    await this.prisma.platformAiCredential.upsert({
      where: { provider },
      create: { provider, isDefault: !hasDefault, ...sealed },
      update: sealed,
    });
    return this.providersView();
  }

  async makeDefault(provider: AiProvider) {
    await this.findKey(provider);
    await this.prisma.$transaction([
      this.prisma.platformAiCredential.updateMany({ data: { isDefault: false } }),
      this.prisma.platformAiCredential.update({ where: { provider }, data: { isDefault: true } }),
    ]);
    return this.providersView();
  }

  async removeKey(provider: AiProvider) {
    const removed = await this.findKey(provider);
    await this.prisma.platformAiCredential.delete({ where: { provider } });
    if (removed.isDefault) {
      const next = await this.prisma.platformAiCredential.findFirst({ orderBy: { updatedAt: 'desc' } });
      if (next) await this.prisma.platformAiCredential.update({ where: { provider: next.provider }, data: { isDefault: true } });
    }
    return this.providersView();
  }

  async tenants(): Promise<TenantSummary[]> {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [organizations, usage] = await Promise.all([
      this.prisma.organization.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, slug: true, createdAt: true,
          _count: { select: { members: true, projects: { where: { deletedAt: null } } } },
          aiSetting: { select: { activeProvider: true } },
        },
      }),
      this.prisma.aiUsage.groupBy({ by: ['organizationId'], where: { createdAt: { gte: since }, success: true }, _count: { _all: true } }),
    ]);
    return Promise.all(organizations.map(async (organization) => {
      const allowance = await this.access.allowance(organization.id);
      const aiMode: TenantSummary['aiMode'] = organization.aiSetting?.activeProvider
        ? 'OWN_KEY'
        : allowance.active && allowance.remaining > 0 ? 'PLATFORM' : 'NONE';
      return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        createdAt: organization.createdAt,
        memberCount: organization._count.members,
        projectCount: organization._count.projects,
        aiMode,
        allowance,
        aiCallsLast30Days: usage.find((row) => row.organizationId === organization.id)?._count._all ?? 0,
      };
    }));
  }

  /** Platform-funded calls per day for the last 30 days, for cost tracking. */
  async platformUsage(): Promise<{ day: string; calls: number; failures: number }[]> {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const rows = await this.prisma.aiUsage.findMany({
      where: { source: AiKeySource.PLATFORM, createdAt: { gte: since } },
      select: { createdAt: true, success: true },
    });
    const byDay = new Map<string, { calls: number; failures: number }>();
    for (const row of rows) {
      const day = row.createdAt.toISOString().slice(0, 10);
      const entry = byDay.get(day) ?? { calls: 0, failures: 0 };
      if (row.success) entry.calls += 1; else entry.failures += 1;
      byDay.set(day, entry);
    }
    return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, counts]) => ({ day, ...counts }));
  }

  private async findKey(provider: AiProvider) {
    const row = await this.prisma.platformAiCredential.findUnique({ where: { provider } });
    if (!row) throw new NotFoundException('No platform key saved for this provider.');
    return row;
  }
}
