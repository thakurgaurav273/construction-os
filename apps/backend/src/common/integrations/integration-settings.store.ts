import { Injectable } from '@nestjs/common';
import { PlatformIntegrationKind, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SecretBoxService } from '../crypto/secret-box.service';

/** A saved integration with its secrets decrypted. Only the storage and mail services ever see this. */
export interface SavedIntegration {
  kind: PlatformIntegrationKind;
  provider: string;
  settings: Record<string, string>;
  secrets: Record<string, string>;
  secretHint: string;
  lastVerifiedAt: Date;
  updatedByEmail: string;
  updatedAt: Date;
}

/** What the settings page may show about a saved integration: never the secrets. */
export type IntegrationRecord = Omit<SavedIntegration, 'secrets'>;

export interface IntegrationInput {
  provider: string;
  settings: Record<string, string>;
  secrets: Record<string, string>;
  secretHint: string;
  updatedByEmail: string;
}

/** Saved settings stay in effect this long on other API instances; the instance that saved reloads at once. */
export const INTEGRATION_CACHE_MS = 30_000;

/**
 * Platform-wide email and storage settings saved from the app (ADR-048). Secrets are sealed as one JSON
 * value with AES-256-GCM before they reach the database.
 */
@Injectable()
export class IntegrationSettingsStore {
  private readonly listeners = new Map<PlatformIntegrationKind, Set<() => void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly secretBox: SecretBoxService,
  ) {}

  get canStoreSecrets(): boolean {
    return this.secretBox.isConfigured;
  }

  async find(kind: PlatformIntegrationKind): Promise<SavedIntegration | null> {
    const row = await this.prisma.platformIntegration.findUnique({ where: { kind } });
    if (!row) return null;
    return { ...toRecord(row), secrets: JSON.parse(this.secretBox.decrypt(row.encryptedSecret)) as Record<string, string> };
  }

  async describe(kind: PlatformIntegrationKind): Promise<IntegrationRecord | null> {
    const row = await this.prisma.platformIntegration.findUnique({ where: { kind } });
    return row ? toRecord(row) : null;
  }

  /** Callers verify the settings first; this only stores them. */
  async save(kind: PlatformIntegrationKind, input: IntegrationInput): Promise<IntegrationRecord> {
    const data = {
      provider: input.provider,
      settings: input.settings,
      encryptedSecret: this.secretBox.encrypt(JSON.stringify(input.secrets)),
      secretHint: input.secretHint,
      lastVerifiedAt: new Date(),
      updatedByEmail: input.updatedByEmail,
    };
    const row = await this.prisma.platformIntegration.upsert({ where: { kind }, create: { kind, ...data }, update: data });
    this.notify(kind);
    return toRecord(row);
  }

  async remove(kind: PlatformIntegrationKind): Promise<void> {
    await this.prisma.platformIntegration.deleteMany({ where: { kind } });
    this.notify(kind);
  }

  /** Lets the storage and mail services drop their cached client as soon as this instance saves. */
  onChange(kind: PlatformIntegrationKind, listener: () => void): void {
    const listeners = this.listeners.get(kind) ?? new Set();
    listeners.add(listener);
    this.listeners.set(kind, listeners);
  }

  private notify(kind: PlatformIntegrationKind): void {
    this.listeners.get(kind)?.forEach((listener) => listener());
  }
}

function toRecord(row: Prisma.PlatformIntegrationGetPayload<object>): IntegrationRecord {
  return {
    kind: row.kind,
    provider: row.provider,
    settings: row.settings as Record<string, string>,
    secretHint: row.secretHint,
    lastVerifiedAt: row.lastVerifiedAt,
    updatedByEmail: row.updatedByEmail,
    updatedAt: row.updatedAt,
  };
}
