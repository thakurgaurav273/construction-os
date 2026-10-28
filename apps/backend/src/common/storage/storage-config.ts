import type { ConfigService } from '@nestjs/config';

export type StorageBackend = 'r2' | 's3' | 's3-compatible' | 'local-disk';

interface StorageCredentials {
  accessKeyId: string;
  secretAccessKey: string;
}

export interface ObjectStorageConfig {
  backend: Exclude<StorageBackend, 'local-disk'>;
  bucket: string;
  region: string;
  /** Unset for Amazon S3, where the SDK derives it from the region. */
  endpoint?: string;
  /** Unset on Amazon S3 to use the SDK's default chain (IAM role, instance profile, AWS_* variables). */
  credentials?: StorageCredentials;
  /** MinIO and most self-hosted S3 servers don't support bucket subdomains. */
  forcePathStyle: boolean;
}

export interface LocalDiskConfig {
  backend: 'local-disk';
  directory: string;
}

export type StorageConfig = ObjectStorageConfig | LocalDiskConfig;

export type ObjectStorageDriver = 's3' | 'r2';

/** Bucket settings as entered, from the server environment or the platform admin's form. */
export interface ObjectStorageInput {
  driver: ObjectStorageDriver;
  bucket?: string;
  region?: string;
  endpoint?: string;
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

/** What each input is called where it was entered, so errors point at the right variable or field. */
export type StorageFieldLabels = Record<Exclude<keyof ObjectStorageInput, 'driver'>, string>;

const ENV_LABELS: StorageFieldLabels = {
  bucket: 'STORAGE_BUCKET',
  region: 'STORAGE_REGION',
  endpoint: 'STORAGE_ENDPOINT',
  accountId: 'R2_ACCOUNT_ID',
  accessKeyId: 'STORAGE_ACCESS_KEY',
  secretAccessKey: 'STORAGE_SECRET_KEY',
};

const DRIVERS = ['local', 's3', 'r2'] as const;

/**
 * Reads STORAGE_DRIVER and its settings. A half-configured bucket fails at startup instead of on the first
 * upload, and there are no fallback credentials: object storage is only used with keys the host provided.
 */
export function readStorageConfig(config: ConfigService): StorageConfig {
  const driver = config.get<string>('STORAGE_DRIVER') || 'local';
  if (!isDriver(driver)) {
    throw new Error(`STORAGE_DRIVER must be one of ${DRIVERS.join(', ')} (got "${driver}").`);
  }
  if (driver === 'local') {
    return { backend: 'local-disk', directory: config.get<string>('STORAGE_LOCAL_DIR') || '.storage' };
  }
  return buildObjectStorageConfig(
    {
      driver,
      bucket: config.get<string>('STORAGE_BUCKET'),
      region: config.get<string>('STORAGE_REGION'),
      endpoint: config.get<string>('STORAGE_ENDPOINT'),
      accountId: config.get<string>('R2_ACCOUNT_ID'),
      accessKeyId: config.get<string>('STORAGE_ACCESS_KEY'),
      secretAccessKey: config.get<string>('STORAGE_SECRET_KEY'),
    },
    ENV_LABELS,
    config.get<string>('NODE_ENV') === 'production',
  );
}

/** Validates bucket settings and turns them into S3 client settings. Throws a message naming the bad input. */
export function buildObjectStorageConfig(input: ObjectStorageInput, labels: StorageFieldLabels, isProduction: boolean): ObjectStorageConfig {
  const value = (field: keyof StorageFieldLabels): string | undefined => input[field]?.trim() || undefined;
  const required = (field: keyof StorageFieldLabels): string => {
    const given = value(field);
    if (!given) throw new Error(`${labels[field]} is required.`);
    return given;
  };

  const bucket = required('bucket');
  if (input.driver === 'r2') {
    const accountId = required('accountId');
    if (!/^[a-f0-9]{32}$/i.test(accountId)) throw new Error(`${labels.accountId} must be the 32-character Cloudflare account ID.`);
    return {
      backend: 'r2',
      bucket,
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: required('accessKeyId'), secretAccessKey: required('secretAccessKey') },
      forcePathStyle: false,
    };
  }

  const endpoint = value('endpoint');
  if (endpoint) assertEndpoint(endpoint, labels.endpoint, isProduction);
  const accessKeyId = value('accessKeyId');
  const secretAccessKey = value('secretAccessKey');
  if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
    throw new Error(`Set both ${labels.accessKeyId} and ${labels.secretAccessKey}, or neither.`);
  }
  const credentials = accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;
  if (endpoint && !credentials) throw new Error(`${labels.accessKeyId} and ${labels.secretAccessKey} are required with a custom endpoint.`);
  return {
    backend: endpoint ? 's3-compatible' : 's3',
    bucket,
    region: endpoint ? value('region') ?? 'us-east-1' : required('region'),
    endpoint,
    credentials,
    forcePathStyle: Boolean(endpoint),
  };
}

function isDriver(value: string): value is (typeof DRIVERS)[number] {
  return (DRIVERS as readonly string[]).includes(value);
}

/** Plain http is allowed for a local MinIO in development only; in production keys and files would cross the network unencrypted. */
function assertEndpoint(value: string, label: string, isProduction: boolean): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be a URL such as https://s3.example.com.`);
  }
  const allowed = isProduction ? ['https:'] : ['https:', 'http:'];
  if (!allowed.includes(url.protocol)) throw new Error(`${label} must use https in production.`);
}
