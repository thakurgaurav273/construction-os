import { Injectable, Logger, OnApplicationBootstrap, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { INTEGRATION_CACHE_MS, IntegrationSettingsStore } from '../integrations/integration-settings.store';
import { LocalDiskStorage } from './local-disk-storage';
import { createS3Client, describeStorageError, verifyObjectStorage } from './object-storage-client';
import { buildObjectStorageConfig, readStorageConfig, StorageBackend, StorageConfig } from './storage-config';
import { SavedStorageFields, savedStorageInput, STORAGE_FORM_LABELS } from './saved-storage';

export type { StorageBackend } from './storage-config';

type ActiveStorage =
  | { backend: 'local-disk'; disk: LocalDiskStorage }
  | { backend: Exclude<StorageBackend, 'local-disk'>; client: S3Client; bucket: string };

/** Where files currently go, and whether that was set in the app or in the server environment. */
export interface StorageStatus {
  backend: StorageBackend;
  source: 'app' | 'server';
}

interface CachedStorage extends StorageStatus {
  storage: ActiveStorage;
  loadedAt: number;
  /** updatedAt of the saved settings it was built from; null for the server environment's. */
  version: number | null;
}

/**
 * Where documents, photos, logos and reports live: Amazon S3, Cloudflare R2, another S3-compatible server,
 * or this server's disk in development. A bucket a platform admin saved in the app wins over the server
 * environment. Buckets stay private; every download goes through a short-lived signed link.
 */
@Injectable()
export class StorageService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StorageService.name);
  private readonly serverStorage: ActiveStorage;
  private cached: CachedStorage | null = null;
  /** Set when STORAGE_DRIVER=local; FilesController serves its signed links, even after a bucket is connected. */
  readonly localDisk: LocalDiskStorage | null;

  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly integrations?: IntegrationSettingsStore,
  ) {
    const serverConfig = readStorageConfig(config);
    this.localDisk = serverConfig.backend === 'local-disk'
      ? new LocalDiskStorage(
        serverConfig.directory,
        config.getOrThrow<string>('COOKIE_SECRET'),
        config.get<string>('PUBLIC_API_URL', `http://localhost:${config.get<string>('PORT', '3001')}`),
      )
      : null;
    this.serverStorage = this.open(serverConfig);
    integrations?.onChange('STORAGE', () => {
      this.cached = null;
    });
  }

  /** Reports a wrong bucket or key in the logs at startup rather than on someone's first upload. */
  async onApplicationBootstrap(): Promise<void> {
    const { storage, source } = await this.current().catch((error: unknown) => {
      this.logger.error(`Saved file storage settings can't be read: ${String(error)}`);
      return { storage: this.serverStorage, source: 'server' as const };
    });
    if (storage.backend === 'local-disk') {
      if (this.config.get<string>('NODE_ENV') === 'production') {
        this.logger.warn('File storage is on local disk. Files are lost when this server is replaced; connect S3 or R2 in Settings → Integrations.');
      }
      return;
    }
    try {
      await storage.client.send(new HeadBucketCommand({ Bucket: storage.bucket }));
      this.logger.log(`File storage connected (${storage.backend}, bucket ${storage.bucket}, set in the ${source === 'app' ? 'app' : 'server environment'}).`);
    } catch (error) {
      this.logger.error(`Can't reach storage bucket ${storage.bucket} (${storage.backend}): ${describeStorageError(error, storage.bucket)}`);
    }
  }

  async status(): Promise<StorageStatus> {
    const { backend, source } = await this.current();
    return { backend, source };
  }

  /** Validates bucket settings from the admin form and proves they work. Throws a message to show them. */
  async verify(input: SavedStorageFields): Promise<void> {
    const config = buildObjectStorageConfig(savedStorageInput(input), STORAGE_FORM_LABELS, this.isProduction);
    await verifyObjectStorage(config);
  }

  /** Stores the file and returns its key; callers share it through getSignedDownloadUrl. */
  async upload(key: string, body: Buffer, mimeType: string): Promise<string> {
    const { storage } = await this.current();
    if (storage.backend === 'local-disk') {
      await storage.disk.write(key, body);
      return key;
    }
    await storage.client.send(new PutObjectCommand({ Bucket: storage.bucket, Key: key, Body: body, ContentType: mimeType }));
    return key;
  }

  /** With `downloadAs`, the browser saves the file under that name instead of opening it. */
  async getSignedDownloadUrl(key: string, expiresIn = 3600, downloadAs?: string): Promise<string> {
    const { storage } = await this.current();
    if (storage.backend === 'local-disk') return storage.disk.signedUrl(key, expiresIn, downloadAs);
    return getSignedUrl(
      storage.client,
      new GetObjectCommand({
        Bucket: storage.bucket,
        Key: key,
        ...(downloadAs && { ResponseContentDisposition: `attachment; filename="${downloadAs.replace(/"/g, '')}"` }),
      }),
      { expiresIn },
    );
  }

  /** The file's bytes, e.g. to attach a generated report to an email. */
  async download(key: string): Promise<Buffer> {
    const { storage } = await this.current();
    if (storage.backend === 'local-disk') return storage.disk.read(key);
    const object = await storage.client.send(new GetObjectCommand({ Bucket: storage.bucket, Key: key }));
    if (!object.Body) throw new Error(`Stored file ${key} is empty.`);
    return Buffer.from(await object.Body.transformToByteArray());
  }

  async delete(key: string): Promise<void> {
    const { storage } = await this.current();
    if (storage.backend === 'local-disk') {
      await storage.disk.remove(key);
      return;
    }
    await storage.client.send(new DeleteObjectCommand({ Bucket: storage.bucket, Key: key }));
  }

  private get isProduction(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  /** The saved bucket when there is one, else the server environment's. Re-checked every 30 s for saves on other instances. */
  private async current(): Promise<CachedStorage> {
    const now = Date.now();
    if (this.cached && now - this.cached.loadedAt < INTEGRATION_CACHE_MS) return this.cached;
    const saved = await this.integrations?.describe('STORAGE');
    const version = saved ? saved.updatedAt.getTime() : null;
    if (this.cached && this.cached.version === version) {
      this.cached.loadedAt = now;
      return this.cached;
    }
    const storage = saved ? await this.openSaved() : this.serverStorage;
    const previous = this.cached?.storage;
    if (previous && previous !== this.serverStorage && previous.backend !== 'local-disk') previous.client.destroy();
    this.cached = { storage, backend: storage.backend, source: saved ? 'app' : 'server', loadedAt: now, version };
    return this.cached;
  }

  private async openSaved(): Promise<ActiveStorage> {
    const saved = await this.integrations?.find('STORAGE');
    if (!saved) return this.serverStorage;
    const input = savedStorageInput({ provider: saved.provider, ...saved.settings, ...saved.secrets });
    return this.open(buildObjectStorageConfig(input, STORAGE_FORM_LABELS, this.isProduction));
  }

  private open(config: StorageConfig): ActiveStorage {
    if (config.backend === 'local-disk') {
      if (!this.localDisk) throw new Error('Local disk storage is not configured.');
      return { backend: 'local-disk', disk: this.localDisk };
    }
    return { backend: config.backend, client: createS3Client(config), bucket: config.bucket };
  }
}
