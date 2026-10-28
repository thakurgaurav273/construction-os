import type { ObjectStorageDriver, ObjectStorageInput, StorageFieldLabels } from './storage-config';

/** Bucket settings as saved from Settings → Integrations; the keys are stored encrypted. */
export interface SavedStorageFields {
  provider: string;
  bucket?: string;
  region?: string;
  endpoint?: string;
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export const STORAGE_FORM_LABELS: StorageFieldLabels = {
  bucket: 'Bucket',
  region: 'Region',
  endpoint: 'Endpoint',
  accountId: 'Account ID',
  accessKeyId: 'Access key ID',
  secretAccessKey: 'Secret access key',
};

export const STORAGE_PROVIDERS: readonly ObjectStorageDriver[] = ['s3', 'r2'];

export function isStorageProvider(value: string): value is ObjectStorageDriver {
  return (STORAGE_PROVIDERS as readonly string[]).includes(value);
}

export function savedStorageInput({ provider, ...fields }: SavedStorageFields): ObjectStorageInput {
  if (!isStorageProvider(provider)) throw new Error(`Unknown storage provider "${provider}".`);
  return { ...fields, driver: provider };
}
