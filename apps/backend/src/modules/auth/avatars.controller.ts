import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { extname } from 'path';
import { AvatarService } from './avatar.service';

const CONTENT_TYPES: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

/**
 * Serves profile photos to <img> tags, which can't send credentials across origins. Like a presigned
 * link, the random file name is the credential, and only someone's current photo is served.
 */
@SkipThrottle()
@Controller('avatars')
export class AvatarsController {
  constructor(private readonly avatars: AvatarService) {}

  @Get(':userId/:fileName')
  async photo(@Param('userId', ParseUUIDPipe) userId: string, @Param('fileName') fileName: string, @Res() res: Response): Promise<void> {
    const body = await this.avatars.read(userId, fileName);
    if (!body) throw new NotFoundException('Photo not found.');
    res.setHeader('Content-Type', CONTENT_TYPES[extname(fileName)] ?? 'application/octet-stream');
    // A new photo gets a new file name, so this one never changes.
    res.setHeader('Cache-Control', `public, max-age=${ONE_YEAR_SECONDS}, immutable`);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(body);
  }
}
