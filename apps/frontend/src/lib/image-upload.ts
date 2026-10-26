/** Matches the API: raster images only (an SVG could carry script), up to 2 MB. */
export const IMAGE_UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const MAX_IMAGE_UPLOAD_BYTES = 2 * 1024 * 1024;

/** Why a picked file can't be uploaded as a logo or photo, or null when it can. */
export function imageUploadError(file: File, label: string): string | null {
  if (!IMAGE_UPLOAD_TYPES.includes(file.type)) return 'Upload a PNG, JPG or WebP image.';
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) return `The ${label} must be 2 MB or smaller.`;
  return null;
}
