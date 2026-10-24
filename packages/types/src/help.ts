/**
 * Product tours and the getting-started checklist. The tour content lives in the frontend; these keys are
 * shared so the API only stores progress for tours that exist.
 */
export const TOUR_KEYS = [
  'welcome',
  'projects',
  'daily-reports',
  'procurement',
  'materials',
  'inventory',
  'workforce',
  'finance',
  'billing',
  'reports',
] as const;

export type TourKey = (typeof TOUR_KEYS)[number];

export type TourStatus = 'COMPLETED' | 'SKIPPED';

export interface TourProgress {
  tour: TourKey;
  status: TourStatus;
  updatedAt: string;
}

/** Each step ticks off from the organization's real data, never from a click. */
export const CHECKLIST_STEP_KEYS = [
  'invite-team',
  'create-project',
  'submit-daily-report',
  'record-attendance',
  'add-store',
  'raise-purchase-order',
  'add-boq',
] as const;

export type ChecklistStepKey = (typeof CHECKLIST_STEP_KEYS)[number];

export interface GettingStartedChecklist {
  /** Dismissed by this member; the steps keep ticking off regardless. */
  dismissed: boolean;
  steps: Record<ChecklistStepKey, boolean>;
}

export interface HelpProgress {
  tours: TourProgress[];
  checklist: GettingStartedChecklist;
}
