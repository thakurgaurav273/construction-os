'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, cn } from '@sitepilot/ui';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const OPTIONS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'Match device', icon: Monitor },
];

/** Personal: light or dark mode is each member's own choice, remembered on this device. */
export function AppearanceCard(): React.ReactElement {
  const { theme, setTheme } = useTheme();
  // The stored theme is only known in the browser; render a neutral state until then.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your appearance</CardTitle>
        <CardDescription>Just for you, on this device. The brand colour above applies in both modes.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid max-w-md grid-cols-3 gap-2" role="radiogroup" aria-label="Appearance">
          {OPTIONS.map((option) => {
            const selected = mounted && theme === option.value;
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(option.value)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected && 'border-primary bg-primary/5 font-medium',
                )}
              >
                <Icon className="h-5 w-5" /> {option.label}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
