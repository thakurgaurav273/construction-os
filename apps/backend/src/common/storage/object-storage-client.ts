import { randomUUID } from 'crypto';
import {
  DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client,
} from '@aws-sdk/client-s3';
import type { ObjectStorageConfig } from './storage-config';

export function createS3Client(config: ObjectStorageConfig): S3Client {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: config.credentials,
    forcePathStyle: config.forcePathStyle,
    // A wrong endpoint should fail the connection test quickly, not hang the request.
    maxAttempts: 2,
  });
}

/**
 * Proves the bucket works before anything is saved: these keys can write, read and delete in the bucket.
 * Throws a message a platform admin can act on; the provider's raw error is never shown.
 */
export async function verifyObjectStorage(config: ObjectStorageConfig): Promise<void> {
  const client = createS3Client(config);
  const probeKey = `_sitepilot/connection-test-${randomUUID()}.txt`;
  try {
    await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: probeKey, Body: 'ok', ContentType: 'text/plain' }));
    const object = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: probeKey }));
    if ((await object.Body?.transformToString()) !== 'ok') throw new Error('Read back different content.');
    await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: probeKey }));
  } catch (error) {
    throw new Error(describeStorageError(error, config.bucket));
  } finally {
    client.destroy();
  }
}

export function describeStorageError(error: unknown, bucket: string): string {
  const name = error instanceof Error ? error.name : '';
  const code = (error as { code?: string } | null)?.code ?? '';
  const status = (error as { $metadata?: { httpStatusCode?: number } } | null)?.$metadata?.httpStatusCode;
  if (['InvalidAccessKeyId', 'SignatureDoesNotMatch', 'Unauthorized'].includes(name) || status === 401) {
    return 'The access key or secret was rejected. Check both and try again.';
  }
  if (name === 'AccessDenied' || status === 403) {
    return `These keys can't write to "${bucket}". Give them read, write and delete access to this bucket.`;
  }
  if (name === 'NoSuchBucket' || name === 'NotFound' || status === 404) {
    return `Bucket "${bucket}" wasn't found. Check the name and region.`;
  }
  if (name === 'PermanentRedirect' || name === 'AuthorizationHeaderMalformed' || status === 301) {
    return `Bucket "${bucket}" is in a different region. Enter the bucket's own region.`;
  }
  if (['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN'].includes(code) || name === 'TimeoutError') {
    return 'Couldn’t reach the storage endpoint. Check the endpoint or account ID.';
  }
  return 'The bucket couldn’t be used with these settings. Check them and try again.';
}
