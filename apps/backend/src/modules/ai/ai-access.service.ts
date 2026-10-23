import { ForbiddenException, Injectable } from '@nestjs/common';
import { AiAccessRequestStatus, AiKeySource, AiProvider } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SecretBoxService } from '../../common/crypto/secret-box.service';

export interface ResolvedAiAccess {
  source: AiKeySource;
  provider: AiProvider;
  model: string;
  apiKey: string;
}

export interface PlatformAllowance {
  granted: number;
  used: number;
  remaining: number;
  expiresAt: Date | null;
  active: boolean;
}

export type AiAccessMode = 'OWN_KEY' | 'PLATFORM' | 'NONE';

export interface AiAccessStatus {
  mode: AiAccessMode;
  provider: AiProvider | null;
  model: string | null;
  allowance: PlatformAllowance;
  /** Why AI can't be used right now, in words for the member; null when it can. */
  blockedReason: string | null;
}

/** Thrown when an organization has no usable AI access; the frontend shows `message` and a way to fix it. */
export class AiAccessDeniedException extends ForbiddenException {
  constructor(code: 'NOT_CONFIGURED' | 'ALLOWANCE_USED' | 'ALLOWANCE_EXPIRED' | 'PLATFORM_UNAVAILABLE', message: string) {
    super({ message, code });
  }
}

/**
 * Decides which key pays for a call. A tenant's own active key always wins. Without one, the tenant can use
 * the platform's default key while an approved trial or top-up has requests left and hasn't expired.
 */
@Injectable()
export class AiAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly secrets: SecretBoxService,
  ) {}

  async resolve(organizationId: string): Promise<ResolvedAiAccess> {
    const own = await this.ownCredential(organizationId);
    if (own) {
      return { source: AiKeySource.ORGANIZATION, provider: own.provider, model: own.model, apiKey: this.secrets.decrypt(own.encryptedKey) };
    }

    const allowance = await this.allowance(organizationId);
    if (allowance.granted === 0 && !allowance.expiresAt) {
      throw new AiAccessDeniedException('NOT_CONFIGURED', 'AI isn’t set up for your organization yet. An admin can add an API key or request a free trial in Settings → AI.');
    }
    if (!allowance.active) {
      throw new AiAccessDeniedException('ALLOWANCE_EXPIRED', 'Your AI trial has ended. An admin can request more usage or add your own API key in Settings → AI.');
    }
    if (allowance.remaining <= 0) {
      throw new AiAccessDeniedException('ALLOWANCE_USED', 'Your AI requests are used up. An admin can request more usage or add your own API key in Settings → AI.');
    }

    const platform = await this.prisma.platformAiCredential.findFirst({ where: { isDefault: true } })
      ?? await this.prisma.platformAiCredential.findFirst({ orderBy: { updatedAt: 'desc' } });
    if (!platform) {
      throw new AiAccessDeniedException('PLATFORM_UNAVAILABLE', 'The platform AI service isn’t available right now. Try again later or add your own API key.');
    }
    return { source: AiKeySource.PLATFORM, provider: platform.provider, model: platform.model, apiKey: this.secrets.decrypt(platform.encryptedKey) };
  }

  async status(organizationId: string): Promise<AiAccessStatus> {
    const [own, allowance] = await Promise.all([this.ownCredential(organizationId), this.allowance(organizationId)]);
    if (own) return { mode: 'OWN_KEY', provider: own.provider, model: own.model, allowance, blockedReason: null };
    try {
      const access = await this.resolve(organizationId);
      return { mode: 'PLATFORM', provider: access.provider, model: access.model, allowance, blockedReason: null };
    } catch (error) {
      const message = error instanceof AiAccessDeniedException ? String((error.getResponse() as { message: string }).message) : 'AI is unavailable.';
      return { mode: 'NONE', provider: null, model: null, allowance, blockedReason: message };
    }
  }

  /**
   * Requests granted by approved trials/top-ups that haven't expired, and how many platform-funded calls
   * succeeded since the earliest of them started. Expired grants simply stop counting.
   */
  async allowance(organizationId: string, now: Date = new Date()): Promise<PlatformAllowance> {
    const grants = await this.prisma.aiAccessRequest.findMany({
      where: { organizationId, status: AiAccessRequestStatus.APPROVED },
      select: { grantedRequests: true, startsAt: true, expiresAt: true },
    });
    const live = grants.filter((grant) => grant.expiresAt && grant.expiresAt > now);
    const latestExpiry = grants.reduce<Date | null>((latest, grant) => (
      grant.expiresAt && (!latest || grant.expiresAt > latest) ? grant.expiresAt : latest
    ), null);
    if (live.length === 0) {
      return { granted: 0, used: 0, remaining: 0, expiresAt: latestExpiry, active: false };
    }

    const granted = live.reduce((sum, grant) => sum + (grant.grantedRequests ?? 0), 0);
    const since = live.reduce((earliest, grant) => (grant.startsAt && grant.startsAt < earliest ? grant.startsAt : earliest), now);
    const used = await this.prisma.aiUsage.count({
      where: { organizationId, source: AiKeySource.PLATFORM, success: true, createdAt: { gte: since } },
    });
    return { granted, used, remaining: Math.max(0, granted - used), expiresAt: latestExpiry, active: true };
  }

  private async ownCredential(organizationId: string) {
    const setting = await this.prisma.aiOrgSetting.findUnique({ where: { organizationId } });
    if (!setting?.activeProvider) return null;
    return this.prisma.aiCredential.findUnique({
      where: { organizationId_provider: { organizationId, provider: setting.activeProvider } },
    });
  }
}
