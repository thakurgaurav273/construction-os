import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
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
@Controller('files')
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @Get(':token')
  async download(@Param('token') token: string, @Res() res: Response): Promise<void> {
    const grant = this.storage.localDisk?.verify(token);
    if (!grant) throw new NotFoundException('This link has expired. Open the file again from SitePilot.');
    const { key, downloadAs } = grant;
    try {
      const body = await this.storage.download(key);
      res.setHeader('Content-Type', CONTENT_TYPES[extname(key).toLowerCase()] ?? 'application/octet-stream');
      const disposition = downloadAs ? 'attachment' : 'inline';
      res.setHeader('Content-Disposition', `${disposition}; filename="${(downloadAs ?? key.split('/').pop() ?? 'file').replace(/"/g, '')}"`);
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.send(body);
    } catch {
      throw new NotFoundException('File not found.');
    }
  }
}
