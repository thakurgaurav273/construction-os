import React from 'react';
import type { RowAction } from '@/hooks/api/use-data-import';

const TILES: { action: RowAction; label: string; tone: string }[] = [
  { action: 'create', label: 'New', tone: 'text-emerald-600 dark:text-emerald-400' },
  { action: 'update', label: 'Updates', tone: 'text-foreground' },
  { action: 'skip', label: 'Skipped', tone: 'text-muted-foreground' },
  { action: 'error', label: 'Problems', tone: 'text-destructive' },
];

export function ImportSummary({ summary }: { summary: Record<RowAction, number> }): React.ReactElement {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {TILES.map((tile) => (
        <div key={tile.action} className="rounded-lg border p-4">
          <dt className="text-xs text-muted-foreground">{tile.label}</dt>
          <dd className={`text-2xl font-semibold tabular-nums ${tile.tone}`}>{summary[tile.action]}</dd>
        </div>
      ))}
    </dl>
  );
}
