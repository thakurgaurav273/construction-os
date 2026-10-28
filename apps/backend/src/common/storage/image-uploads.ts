import { BadRequestException } from '@nestjs/common';

/** Raster formats only: an uploaded SVG could carry script. Maps the MIME type to the stored extension. */
export const RASTER_IMAGE_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export interface CheckedImage {
  buffer: Buffer;
  mimeType: string;
  /** The extension to store it under. */
  extension: string;
}

/** Checks an uploaded logo or photo: present, a raster image, and small enough. */
export function readRasterImage(file: Express.Multer.File | undefined, label: string): CheckedImage {
  if (!file) throw new BadRequestException('Choose an image to upload.');
  const extension = RASTER_IMAGE_TYPES[file.mimetype];
  if (!extension) throw new BadRequestException('Upload a PNG, JPG or WebP image.');
  if (file.size > MAX_IMAGE_BYTES) throw new BadRequestException(`The ${label} must be 2 MB or smaller.`);
  return { buffer: file.buffer, mimeType: file.mimetype, extension };
}
