'use client';

import React from 'react';
import { CircleHelp } from 'lucide-react';
import { Button } from '@sitepilot/ui';
import { useHelpStore } from '@/store/help.store';

export function HelpButton(): React.ReactElement {
  const openHelp = useHelpStore((state) => state.openHelp);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full text-muted-foreground hover:text-foreground"
      aria-label="Help & guides"
      title="Help & guides"
      data-tour="header-help"
      onClick={() => openHelp()}
    >
      <CircleHelp className="h-5 w-5" />
    </Button>
  );
}
