'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ListChecks, RotateCcw, Search } from 'lucide-react';
import { Button, Input, ScrollArea, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@sitepilot/ui';
import { toast } from 'sonner';
import { useCan } from '@/hooks/api/use-access';
import { useHelpStore } from '@/store/help.store';
import { useDismissChecklist, useHelpProgress, useRestartTour } from '@/hooks/api/use-help';
import { GuideMatch, findGuide, helpModuleForPath, searchGuides } from '../help-utils';
import { useVisibleHelpModules } from '../hooks/use-visible-help';
import { visibleChecklistSteps } from '../checklist';
import { HelpGuideDetail } from './HelpGuideDetail';
import { HelpGuideList } from './HelpGuideList';

/** Side drawer with every guide the member's role allows, opening on the current page's module. */
export function HelpCenter(): React.ReactElement {
  const pathname = usePathname();
  const { isOpen, guideId, closeHelp } = useHelpStore();
  const modules = useVisibleHelpModules();
  const { data: progress } = useHelpProgress();
  const restartTours = useRestartTour();
  const dismissChecklist = useDismissChecklist();
  const can = useCan();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<GuideMatch | null>(null);

  // Each opening starts fresh: on the requested guide, or on the list for this page.
  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setSelected(guideId ? findGuide(modules, guideId) ?? null : null);
  }, [isOpen, guideId, modules]);

  const currentModule = helpModuleForPath(modules, pathname);
  const results = useMemo(() => (query.trim() ? searchGuides(modules, query) : null), [modules, query]);

  function restartAllTours(): void {
    restartTours.mutate(null, { onSuccess: () => toast.success('Tours will play again as you open each page.') });
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) closeHelp(); }}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="space-y-3 border-b p-5 pr-12">
          <div>
            <SheetTitle>Help &amp; guides</SheetTitle>
            <SheetDescription>Short, step-by-step guides for the things you do in SitePilot.</SheetDescription>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setSelected(null); }}
              placeholder="Search guides…"
              aria-label="Search guides"
              className="pl-9"
            />
          </div>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-3">
            {selected
              ? <div className="p-2"><HelpGuideDetail match={selected} onBack={() => setSelected(null)} /></div>
              : <HelpGuideList modules={modules} currentModule={currentModule} results={results} onSelect={setSelected} />}
          </div>
        </ScrollArea>
        <div className="flex flex-wrap gap-2 border-t p-3">
          <Button variant="ghost" size="sm" onClick={restartAllTours} disabled={restartTours.isPending}>
            <RotateCcw className="mr-2 h-4 w-4" /> Restart tours
          </Button>
          {progress?.checklist.dismissed && visibleChecklistSteps(can).length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => dismissChecklist.mutate(false)} disabled={dismissChecklist.isPending}>
              <ListChecks className="mr-2 h-4 w-4" /> Show getting-started checklist
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
