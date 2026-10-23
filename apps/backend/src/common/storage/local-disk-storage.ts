import { createHmac, timingSafeEqual } from 'crypto';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { dirname, join, resolve, sep } from 'path';

/**
 * Files on the API server's disk, for development without MinIO or R2. Downloads go through signed,
 * expiring links served by FilesController, like S3 presigned URLs. Not for production: files live on one
 * machine and disappear with it.
 */
export class LocalDiskStorage {
  private readonly root: string;

  constructor(directory: string, private readonly secret: string, private readonly publicApiUrl: string) {
    this.root = resolve(directory);
  }

  async write(key: string, body: Buffer): Promise<void> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  }

  read(key: string): Promise<Buffer> {
    return readFile(this.pathFor(key));
  }

  async remove(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true });
  }

  signedUrl(key: string, expiresInSeconds: number, downloadAs?: string): string {
    const claims = { key, exp: Math.floor(Date.now() / 1000) + expiresInSeconds, ...(downloadAs && { dl: downloadAs }) };
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
    return `${this.publicApiUrl.replace(/\/$/, '')}/api/files/${payload}.${this.sign(payload)}`;
  }

  /** The key a download token grants (and the file name to save it as), or null when it is forged or expired. */
  verify(token: string): { key: string; downloadAs: string | null } | null {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;
    const expected = Buffer.from(this.sign(payload));
    const given = Buffer.from(signature);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    try {
      const { key, exp, dl } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { key?: unknown; exp?: unknown; dl?: unknown };
      if (typeof key !== 'string' || typeof exp !== 'number' || exp < Date.now() / 1000) return null;
      return { key, downloadAs: typeof dl === 'string' ? dl : null };
    } catch {
      return null;
    }
  }

  /** Keys come from our own code, but never let one escape the storage directory. */
  private pathFor(key: string): string {
    const path = resolve(join(this.root, key));
    if (!path.startsWith(this.root + sep)) throw new Error('Invalid storage key.');
    return path;
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.secret).update(payload).digest('base64url');
  }
}
