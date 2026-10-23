import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const ALGORITHM = 'aes-256-gcm';
const VERSION = 'v1';
const IV_BYTES = 12;

/**
 * Encrypts third-party secrets (AI provider keys) before they touch the database. AES-256-GCM with a random
 * IV per value; the auth tag makes tampering detectable. The key lives only in AI_KEYS_ENCRYPTION_KEY
 * (32 random bytes, base64). Without it, saving or using stored keys is refused rather than silently weakened.
 */
@Injectable()
export class SecretBoxService {
  private readonly logger = new Logger(SecretBoxService.name);
  private readonly key: Buffer | null;

  constructor(config: ConfigService) {
    const raw = config.get<string>('AI_KEYS_ENCRYPTION_KEY')?.trim();
    const key = raw ? Buffer.from(raw, 'base64') : null;
    if (raw && key?.length !== 32) {
      throw new Error('AI_KEYS_ENCRYPTION_KEY must be 32 random bytes, base64 encoded (e.g. `openssl rand -base64 32`).');
    }
    this.key = key;
    if (!key) this.logger.warn('AI_KEYS_ENCRYPTION_KEY is not set; AI provider keys cannot be saved or used.');
  }

  get isConfigured(): boolean {
    return this.key !== null;
  }

  encrypt(plaintext: string): string {
    const key = this.requireKey();
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return [VERSION, iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join(':');
  }

  decrypt(sealed: string): string {
    const key = this.requireKey();
    const [version, iv, tag, data] = sealed.split(':');
    if (version !== VERSION || !iv || !tag || !data) throw new InternalServerErrorException('A stored key is unreadable. Save it again.');
    try {
      const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64'));
      decipher.setAuthTag(Buffer.from(tag, 'base64'));
      return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
    } catch {
      throw new InternalServerErrorException('A stored key could not be decrypted. Save it again.');
    }
  }

  private requireKey(): Buffer {
    if (!this.key) {
      throw new InternalServerErrorException('AI keys can’t be stored yet: the server has no encryption key configured.');
    }
    return this.key;
  }
}

/** "…a1b2": enough to recognise a key without revealing it. */
export function keyHint(secret: string): string {
  return `…${secret.trim().slice(-4)}`;
}
