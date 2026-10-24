import type { Permission } from '@sitepilot/types';
import { HELP_MODULES } from './content';
import type { HelpGuide, HelpModule } from './types';

export interface GuideMatch {
  helpModule: HelpModule;
  guide: HelpGuide;
}

/** Modules and guides the member's role allows; modules left with no guides are dropped. */
export function visibleHelpModules(can: (permission: Permission) => boolean): HelpModule[] {
  return HELP_MODULES
    .filter((helpModule) => !helpModule.permission || can(helpModule.permission))
    .map((helpModule) => ({ ...helpModule, guides: helpModule.guides.filter((guide) => !guide.permission || can(guide.permission)) }))
    .filter((helpModule) => helpModule.guides.length > 0);
}

function coversPath(route: string, pathname: string): boolean {
  if (route === '/dashboard') return pathname === route;
  return pathname === route || pathname.startsWith(`${route}/`);
}

/** The module for the current page; the most specific route wins (`/dashboard/ai-assistant` over `/dashboard`). */
export function helpModuleForPath(modules: HelpModule[], pathname: string): HelpModule | undefined {
  let best: { helpModule: HelpModule; length: number } | undefined;
  for (const helpModule of modules) {
    for (const route of helpModule.routes) {
      if (coversPath(route, pathname) && (!best || route.length > best.length)) best = { helpModule, length: route.length };
    }
  }
  return best?.helpModule;
}

export function findGuide(modules: HelpModule[], guideId: string): GuideMatch | undefined {
  for (const helpModule of modules) {
    const guide = helpModule.guides.find((candidate) => candidate.id === guideId);
    if (guide) return { helpModule, guide };
  }
  return undefined;
}

/** Every word must appear somewhere in the guide; title matches rank first. */
export function searchGuides(modules: HelpModule[], query: string): GuideMatch[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const scored: { match: GuideMatch; score: number }[] = [];
  for (const helpModule of modules) {
    for (const guide of helpModule.guides) {
      const title = guide.title.toLowerCase();
      const body = [helpModule.title, guide.summary, guide.tip ?? '', ...(guide.keywords ?? []), ...guide.steps].join(' ').toLowerCase();
      if (!words.every((word) => title.includes(word) || body.includes(word))) continue;
      const score = words.filter((word) => title.includes(word)).length;
      scored.push({ match: { helpModule, guide }, score });
    }
  }
  return scored.sort((a, b) => b.score - a.score).map((entry) => entry.match);
}
