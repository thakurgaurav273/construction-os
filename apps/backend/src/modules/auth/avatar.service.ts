import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { readRasterImage } from '../../common/storage/image-uploads';
import { StorageService } from '../../common/storage/storage.service';
import { PublicUser, toPublicUser } from './auth.service';

/** The path every avatar is served from: /api/avatars/<userId>/<uuid>.<ext>. */
export const AVATAR_PATH_PREFIX = '/api/avatars/';
const AVATAR_FILE = /^[0-9a-f-]{36}\.(png|jpg|webp)$/;

/**
 * Profile photos. A person has one photo across all their organizations, so it lives under the user, not a
 * tenant. `User.avatar` stores the API path it is served from, which every view that already returns
 * `avatar` can pass straight to the browser. The random file name makes each link unguessable, and a
 * new upload gets a new name, so links can be cached for good.
 */
@Injectable()
export class AvatarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(userId: string, file: Express.Multer.File | undefined): Promise<PublicUser> {
    const image = readRasterImage(file, 'photo');
    const previous = await this.findAvatar(userId);
    const fileName = `${randomUUID()}.${image.extension}`;
    await this.storage.upload(storageKey(userId, fileName), image.buffer, image.mimeType);
    const user = await this.prisma.user.update({ where: { id: userId }, data: { avatar: `${AVATAR_PATH_PREFIX}${userId}/${fileName}` } });
    await this.deleteStored(previous);
    return toPublicUser(user);
  }

  async remove(userId: string): Promise<PublicUser> {
    const previous = await this.findAvatar(userId);
    const user = await this.prisma.user.update({ where: { id: userId }, data: { avatar: null } });
    await this.deleteStored(previous);
    return toPublicUser(user);
  }

  /** The stored photo behind a served path, or null for anything that isn't one (wrong shape, someone else's). */
  async read(userId: string, fileName: string): Promise<Buffer | null> {
    if (!AVATAR_FILE.test(fileName)) return null;
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { avatar: true } });
    if (user?.avatar !== `${AVATAR_PATH_PREFIX}${userId}/${fileName}`) return null;
    return this.storage.download(storageKey(userId, fileName)).catch(() => null);
  }

  private async findAvatar(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { avatar: true } });
    if (!user) throw new NotFoundException('Account not found.');
    return user.avatar;
  }

  /** Only photos uploaded here are ours to delete; older avatars may be links to elsewhere. */
  private async deleteStored(avatar: string | null): Promise<void> {
    if (!avatar?.startsWith(AVATAR_PATH_PREFIX)) return;
    const [userId, fileName] = avatar.slice(AVATAR_PATH_PREFIX.length).split('/');
    if (!userId || !fileName) return;
    // A leftover file is harmless; don't fail the request over it.
    await this.storage.delete(storageKey(userId, fileName)).catch(() => undefined);
  }
}

function storageKey(userId: string, fileName: string): string {
  return `users/${userId}/avatars/${fileName}`;
}
