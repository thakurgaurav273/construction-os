import type { LucideIcon } from 'lucide-react';
import type { Permission, TourKey } from '@sitepilot/types';

export type HelpModuleKey =
  | 'getting-started'
  | 'projects'
  | 'daily-reports'
  | 'workforce'
  | 'materials'
  | 'procurement'
  | 'finance'
  | 'billing'
  | 'reports'
  | 'ai'
  | 'settings';

/** One task, written as short steps ("Raise your first RA bill"). */
export interface HelpGuide {
  /** Stable id used by contextual links, e.g. `billing.measurement-book`. */
  id: string;
  title: string;
  summary: string;
  steps: string[];
  tip?: string;
  /** Hidden from members whose role doesn't grant it. */
  permission?: Permission;
  /** Extra words people search with that don't appear in the title. */
  keywords?: string[];
}

export interface HelpModule {
  key: HelpModuleKey;
  title: string;
  icon: LucideIcon;
  /** Path prefixes this module covers; the help center opens on the module for the current page. */
  routes: string[];
  /** Hidden, with all its guides, from members whose role doesn't grant it. */
  permission?: Permission;
  /** The module's mini tour, replayable from the help center. */
  tour?: TourKey;
  guides: HelpGuide[];
}

export interface TourStep {
  /** `data-tour` value of the element to highlight. Omitted for a centred step. */
  target?: string;
  title: string;
  body: string;
  permission?: Permission;
}

export interface TourDefinition {
  key: TourKey;
  title: string;
  /** The module's own permission; the tour never plays for members who can't open the module. */
  permission?: Permission;
  steps: TourStep[];
}
