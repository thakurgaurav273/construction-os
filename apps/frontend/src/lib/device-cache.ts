/**
 * Last-known values kept on this device so the first paint matches what the server will confirm a moment
 * later (permissions, brand colour). Display hints only: the server always decides. Storage can be
 * unavailable (private mode, blocked site data), so every access is guarded and failures are ignored.
 */
const PREFIX = 'sp:';

export const DEVICE_CACHE_KEYS = {
  /** Per organization: the same person can have different roles in each. */
  access: (userId: string, organizationId: string): string => `access:${userId}:${organizationId}`,
  brandCss: 'brand-css',
} as const;

/** Read by the inline boot script in the root layout, before React loads. */
export const BRAND_CSS_STORAGE_KEY = `${PREFIX}${DEVICE_CACHE_KEYS.brandCss}`;

/** The <style> element that boot script adds; BrandThemeStyle removes it once settings have loaded. */
export const BRAND_BOOT_STYLE_ID = 'brand-theme-boot';

export function readDeviceCache<T>(key: string): T | undefined {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function writeDeviceCache<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the next visit just paints without the hint.
  }
}

export function removeDeviceCache(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // Nothing to clean up if storage is blocked.
  }
}

/** On sign-out, so the next person on the device doesn't see the previous member's hints. */
export function clearDeviceCache(): void {
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Nothing to clean up if storage is blocked.
  }
}
