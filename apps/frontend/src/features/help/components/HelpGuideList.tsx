'use client';

import React from 'react';
import { ChevronRight, SearchX } from 'lucide-react';
import type { GuideMatch } from '../help-utils';
import type { HelpGuide, HelpModule } from '../types';

function GuideRow({ guide, onSelect }: { guide: HelpGuide; onSelect: () => void }): React.ReactElement {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="group flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{guide.title}</span>
          <span className="block truncate text-xs text-muted-foreground">{guide.summary}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 group-hover:text-foreground" aria-hidden="true" />
      </button>
    </li>
  );
}

function ModuleSection({ helpModule, label, onSelect }: { helpModule: HelpModule; label?: string; onSelect: (match: GuideMatch) => void }): React.ReactElement {
  return (
    <section aria-label={helpModule.title}>
      <h3 className="mb-1 flex items-center gap-2 px-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <helpModule.icon className="h-3.5 w-3.5" aria-hidden="true" />
        {helpModule.title}
        {label && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-primary">{label}</span>}
      </h3>
      <ul>
        {helpModule.guides.map((guide) => <GuideRow key={guide.id} guide={guide} onSelect={() => onSelect({ helpModule, guide })} />)}
      </ul>
    </section>
  );
}

interface HelpGuideListProps {
  modules: HelpModule[];
  currentModule?: HelpModule;
  /** Search results; null when nothing has been typed. */
  results: GuideMatch[] | null;
  onSelect: (match: GuideMatch) => void;
}

export function HelpGuideList({ modules, currentModule, results, onSelect }: HelpGuideListProps): React.ReactElement {
  if (results) {
    if (results.length === 0) {
      return (
        <div className="flex flex-col items-center py-12 text-center">
          <SearchX className="mb-3 h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
          <p className="text-sm font-medium">No guides match your search</p>
          <p className="mt-1 text-xs text-muted-foreground">Try a different word, such as “bill” or “attendance”.</p>
        </div>
      );
    }
    return (
      <ul aria-label="Search results">
        {results.map((match) => <GuideRow key={match.guide.id} guide={match.guide} onSelect={() => onSelect(match)} />)}
      </ul>
    );
  }

  const otherModules = modules.filter((helpModule) => helpModule.key !== currentModule?.key);
  return (
    <div className="space-y-5">
      {currentModule && <ModuleSection helpModule={currentModule} label="This page" onSelect={onSelect} />}
      {otherModules.map((helpModule) => <ModuleSection key={helpModule.key} helpModule={helpModule} onSelect={onSelect} />)}
    </div>
  );
}
