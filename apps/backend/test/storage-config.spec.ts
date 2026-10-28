import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConfigService } from '@nestjs/config';
import { readStorageConfig } from '../src/common/storage/storage-config';
import { describeStorageError } from '../src/common/storage/object-storage-client';

const configWith = (values: Record<string, string>): ConfigService => ({ get: (key: string) => values[key] }) as unknown as ConfigService;

const ACCOUNT_ID = '0123456789abcdef0123456789abcdef';
const KEYS = { STORAGE_ACCESS_KEY: 'AKIAEXAMPLE', STORAGE_SECRET_KEY: 'secret' };

describe('storage config', () => {
  it('defaults to local disk', () => {
    assert.deepEqual(readStorageConfig(configWith({})), { backend: 'local-disk', directory: '.storage' });
  });

  it('rejects an unknown driver', () => {
    assert.throws(() => readStorageConfig(configWith({ STORAGE_DRIVER: 'minio' })), /STORAGE_DRIVER must be one of/);
  });

  it('builds the R2 endpoint from the account id', () => {
    const config = readStorageConfig(configWith({ STORAGE_DRIVER: 'r2', R2_ACCOUNT_ID: ACCOUNT_ID, STORAGE_BUCKET: 'files', ...KEYS }));
    assert.equal(config.backend, 'r2');
    assert.equal(config.endpoint, `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`);
    assert.equal(config.region, 'auto');
  });

  it('requires keys and a valid account id for R2', () => {
    assert.throws(() => readStorageConfig(configWith({ STORAGE_DRIVER: 'r2', R2_ACCOUNT_ID: ACCOUNT_ID, STORAGE_BUCKET: 'files' })), /STORAGE_ACCESS_KEY is required/);
    assert.throws(() => readStorageConfig(configWith({ STORAGE_DRIVER: 'r2', R2_ACCOUNT_ID: 'my-account', STORAGE_BUCKET: 'files', ...KEYS })), /R2_ACCOUNT_ID/);
  });

  it('uses the AWS credential chain when S3 keys are left out', () => {
    const config = readStorageConfig(configWith({ STORAGE_DRIVER: 's3', STORAGE_BUCKET: 'files', STORAGE_REGION: 'ap-south-1' }));
    assert.equal(config.backend, 's3');
    assert.equal(config.credentials, undefined);
    assert.equal(config.endpoint, undefined);
  });

  it('requires a region for Amazon S3 and both halves of a key pair', () => {
    assert.throws(() => readStorageConfig(configWith({ STORAGE_DRIVER: 's3', STORAGE_BUCKET: 'files' })), /STORAGE_REGION is required/);
    assert.throws(() => readStorageConfig(configWith({ STORAGE_DRIVER: 's3', STORAGE_BUCKET: 'files', STORAGE_REGION: 'ap-south-1', STORAGE_ACCESS_KEY: 'AKIAEXAMPLE' })), /or neither/);
  });

  it('uses path-style requests for a custom endpoint and refuses http in production', () => {
    const minio = { STORAGE_DRIVER: 's3', STORAGE_BUCKET: 'files', STORAGE_ENDPOINT: 'http://localhost:9000', ...KEYS };
    const config = readStorageConfig(configWith(minio));
    assert.equal(config.backend, 's3-compatible');
    assert.equal(config.forcePathStyle, true);
    assert.throws(() => readStorageConfig(configWith({ ...minio, NODE_ENV: 'production' })), /https in production/);
  });
});

describe('storage connection errors', () => {
  const failure = (name: string, httpStatusCode?: number, code?: string): Error =>
    Object.assign(new Error('raw provider message'), { name, code, $metadata: { httpStatusCode } });

  it('explains rejected keys, missing buckets and permissions without the raw error', () => {
    assert.match(describeStorageError(failure('InvalidAccessKeyId', 403), 'files'), /access key or secret was rejected/);
    assert.match(describeStorageError(failure('NoSuchBucket', 404), 'files'), /Bucket "files" wasn't found/);
    assert.match(describeStorageError(failure('AccessDenied', 403), 'files'), /can't write to "files"/);
    assert.match(describeStorageError(failure('Error', undefined, 'ENOTFOUND'), 'files'), /Couldn’t reach the storage endpoint/);
    assert.doesNotMatch(describeStorageError(failure('Weird'), 'files'), /raw provider message/);
  });
});
