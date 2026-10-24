import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { PrismaService } from '../../../src/database/prisma.service';

const BACKEND_DIR = join(__dirname, '..', '..', '..');

/**
 * Connects to the database named by TEST_DATABASE_URL and brings it up to the latest migration.
 * The database name must contain "test" so a misconfigured URL can never point these tests at real data.
 */
export async function connectTestDatabase(): Promise<PrismaService> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('Set TEST_DATABASE_URL to a throwaway Postgres database, e.g. postgresql://localhost:5432/sitepilot_test');
  }
  const databaseName = new URL(url).pathname.slice(1);
  if (!/test/i.test(databaseName)) {
    throw new Error(`Refusing to run integration tests against "${databaseName}": the database name must contain "test".`);
  }

  process.env.DATABASE_URL = url;
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], { cwd: BACKEND_DIR, env: process.env, stdio: 'pipe' });

  const prisma = new PrismaService();
  await prisma.$connect();
  return prisma;
}
