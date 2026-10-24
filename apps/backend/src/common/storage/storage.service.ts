import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { LocalDiskStorage } from './local-disk-storage';

export type StorageBackend = 'r2' | 's3-compatible' | 'local-default' | 'local-disk';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly logger = new Logger(StorageService.name);
  /** Which backend files go to; the local MinIO default and local disk only suit development. */
  readonly backend: StorageBackend;
  /** Set when STORAGE_DRIVER=local: files on this server's disk instead of object storage. */
  readonly localDisk: LocalDiskStorage | null;

  constructor(private readonly config: ConfigService) {
    const accountId = config.get<string>('R2_ACCOUNT_ID', '');
    this.bucket = config.get<string>('R2_BUCKET', 'sitepilot');
    this.publicUrl = config.get<string>('R2_PUBLIC_URL', '');
    this.localDisk = config.get<string>('STORAGE_DRIVER') === 'local'
      ? new LocalDiskStorage(
        config.get<string>('STORAGE_LOCAL_DIR', '.storage'),
        config.getOrThrow<string>('COOKIE_SECRET'),
        config.get<string>('PUBLIC_API_URL', `http://localhost:${config.get<string>('PORT', '3001')}`),
      )
      : null;
    this.backend = this.localDisk ? 'local-disk' : accountId ? 'r2' : config.get<string>('STORAGE_ENDPOINT') ? 's3-compatible' : 'local-default';

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: accountId
        ? `https://${accountId}.r2.cloudflarestorage.com`
        : config.get<string>('STORAGE_ENDPOINT', 'http://localhost:9000'),
      credentials: {
        accessKeyId: config.get<string>('R2_ACCESS_KEY_ID', config.get<string>('STORAGE_ACCESS_KEY', 'minioadmin')!),
        secretAccessKey: config.get<string>('R2_SECRET_ACCESS_KEY', config.get<string>('STORAGE_SECRET_KEY', 'minioadmin')!),
      },
    });
  }

  async upload(key: string, body: Buffer, mimeType: string): Promise<string> {
    if (this.localDisk) {
      await this.localDisk.write(key, body);
      return key;
    }
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: mimeType,
      }),
    );
    return this.publicUrl ? `${this.publicUrl}/${key}` : key;
  }

  /** With `downloadAs`, the browser saves the file under that name instead of opening it. */
  async getSignedDownloadUrl(key: string, expiresIn = 3600, downloadAs?: string): Promise<string> {
    if (this.localDisk) return this.localDisk.signedUrl(key, expiresIn, downloadAs);
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ...(downloadAs && { ResponseContentDisposition: `attachment; filename="${downloadAs.replace(/"/g, '')}"` }),
      }),
      { expiresIn },
    );
  }

  /** The file's bytes, e.g. to attach a generated report to an email. */
  async download(key: string): Promise<Buffer> {
    if (this.localDisk) return this.localDisk.read(key);
    const object = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!object.Body) throw new Error(`Stored file ${key} is empty.`);
    return Buffer.from(await object.Body.transformToByteArray());
  }

  async delete(key: string): Promise<void> {
    if (this.localDisk) {
      await this.localDisk.remove(key);
      return;
    }
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
