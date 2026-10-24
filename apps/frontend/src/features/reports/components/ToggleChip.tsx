import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@sitepilot/ui';

interface ToggleChipProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function ToggleChip({ selected, onClick, children }: ToggleChipProps): React.ReactElement {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted/40 hover:bg-muted',
      )}
    >
      {selected && <Check className="h-3 w-3" />} {children}
    </button>
  );
}
