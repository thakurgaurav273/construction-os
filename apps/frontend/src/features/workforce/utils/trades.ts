import type { Worker } from '@/hooks/api/use-workforce';
import { TRADE_OPTIONS } from '../constants';

/** The common trades first, then any others this organization already uses, alphabetically. */
export function knownTrades(workers: Pick<Worker, 'trade'>[]): string[] {
  const common = new Set(TRADE_OPTIONS.map((trade) => trade.toLowerCase()));
  const custom = new Map<string, string>();
  for (const { trade } of workers) {
    const key = trade.trim().toLowerCase();
    if (key && !common.has(key) && !custom.has(key)) custom.set(key, trade.trim());
  }
  return [...TRADE_OPTIONS, ...[...custom.values()].sort((a, b) => a.localeCompare(b))];
}

/**
 * Tidies a typed trade so the directory doesn't fill with near-duplicates: an existing trade in any casing
 * ("welding" → "Welding") is reused, and lowercase words of a new one are capitalised while acronyms stay ("HVAC").
 */
export function normalizeTrade(input: string, known: string[]): string {
  const trade = input.trim().replace(/\s+/g, ' ');
  const existing = known.find((candidate) => candidate.toLowerCase() === trade.toLowerCase());
  if (existing) return existing;
  return trade.split(' ').map((word) => (word === word.toLowerCase() ? word.charAt(0).toUpperCase() + word.slice(1) : word)).join(' ');
}
