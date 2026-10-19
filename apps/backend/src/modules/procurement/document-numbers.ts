import { Prisma } from '@prisma/client';

const MAX_NUMBERING_ATTEMPTS = 3;

/** Next sequential number such as PO-0009, ignoring values that don't follow the PREFIX-NNNN pattern. */
export function nextDocumentNumber(prefix: string, existing: (string | null)[]): string {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  const highest = existing.reduce((max, value) => {
    const match = value ? pattern.exec(value) : null;
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${prefix}-${String(highest + 1).padStart(4, '0')}`;
}

/**
 * Document numbers are unique per organization. Two concurrent creates can pick the same
 * next number; the loser hits the unique index and simply retries with a fresh number.
 */
export async function withDocumentNumberRetry<T>(create: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await create();
    } catch (error) {
      const isNumberClash = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
      if (!isNumberClash || attempt >= MAX_NUMBERING_ATTEMPTS) throw error;
    }
  }
}
