import type { ChecklistStepKey, TourKey } from '@sitepilot/types';

/**
 * Typed as records so the compiler fails when a tour or checklist step is added to @sitepilot/types but not
 * here (the backend can't import runtime values from the types package).
 */
const KNOWN_TOURS: Record<TourKey, true> = {
  welcome: true,
  projects: true,
  'daily-reports': true,
  procurement: true,
  materials: true,
  inventory: true,
  workforce: true,
  finance: true,
  billing: true,
  reports: true,
};

export const TOUR_KEYS = Object.keys(KNOWN_TOURS) as TourKey[];

export function isTourKey(value: string): value is TourKey {
  return Object.prototype.hasOwnProperty.call(KNOWN_TOURS, value);
}

/** Progress rows are keyed `tour.<tour>`; the checklist has a single row. */
export const TOUR_KEY_PREFIX = 'tour.';
export const CHECKLIST_KEY = 'checklist';

export type ChecklistSteps = Record<ChecklistStepKey, boolean>;
