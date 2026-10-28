import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { extname } from 'path';
import { StorageService } from './storage.service';

const CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

/**
 * Serves local-disk files behind signed, expiring links (STORAGE_DRIVER=local only). The token in the
 * link is the credential, as with S3 presigned URLs, so there is no session check here.
 */
// A page can show many images at once; the signed link already limits what can be fetched.
@SkipThrottle()
@Controller('files')
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @Get(':token')
  async download(@Param('token') token: string, @Res() res: Response): Promise<void> {
    const disk = this.storage.localDisk;
    const grant = disk?.verify(token);
    if (!disk || !grant) throw new NotFoundException('This link has expired. Open the file again from SitePilot.');
    const { key, downloadAs } = grant;
    try {
      const body = await disk.read(key);
      res.setHeader('Content-Type', CONTENT_TYPES[extname(key).toLowerCase()] ?? 'application/octet-stream');
      const disposition = downloadAs ? 'attachment' : 'inline';
      res.setHeader('Content-Disposition', `${disposition}; filename="${(downloadAs ?? key.split('/').pop() ?? 'file').replace(/"/g, '')}"`);
      res.setHeader('Cache-Control', 'private, max-age=300');
      // The app runs on another origin and embeds these (logos, photos); helmet's default would block that.
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.send(body);
    } catch {
      throw new NotFoundException('File not found.');
    }
  }
}
