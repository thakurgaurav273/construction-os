import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly config: ConfigService) {
    const accountId = config.get<string>('R2_ACCOUNT_ID', '');
    this.bucket = config.get<string>('R2_BUCKET', 'sitepilot');
    this.publicUrl = config.get<string>('R2_PUBLIC_URL', '');

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

  async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
