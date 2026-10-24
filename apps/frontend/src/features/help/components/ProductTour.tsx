'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import type { TourStatus } from '@sitepilot/types';
import { useCan, useCurrentAccess } from '@/hooks/api/use-access';
import { useHelpProgress, useUpdateTourProgress } from '@/hooks/api/use-help';
import { useHelpStore } from '@/store/help.store';
import { getTour, tourForPath } from '../tours';
import { TourRunner } from './TourRunner';

/** Gives the page a moment to settle after navigation before a tour covers it. */
const AUTO_START_DELAY_MS = 800;

/**
 * Plays the active tour, and starts a page's tour the first time a member opens it: the welcome tour on
 * the dashboard first, then each module's own. Finished or skipped tours are stored on the server.
 */
export function ProductTour(): React.ReactElement | null {
  const pathname = usePathname();
  const can = useCan();
  const { data: access } = useCurrentAccess();
  const { data: progress } = useHelpProgress();
  const { mutate: updateProgress } = useUpdateTourProgress();
  const { activeTour, isOpen, startTour, endTour } = useHelpStore();

  useEffect(() => {
    if (!progress || !access || activeTour || isOpen) return;
    const tour = tourForPath(pathname);
    if (!tour) return;
    const seen = new Set(progress.tours.map((entry) => entry.tour));
    if (seen.has(tour) || (tour !== 'welcome' && !seen.has('welcome'))) return;
    if (getTour(tour, can).steps.length === 0) return;
    const timer = window.setTimeout(() => startTour(tour), AUTO_START_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [access, activeTour, can, isOpen, pathname, progress, startTour]);

  const definition = useMemo(() => (activeTour ? getTour(activeTour, can) : null), [activeTour, can]);

  const finish = useCallback((status: TourStatus) => {
    if (activeTour) updateProgress({ tour: activeTour, status });
    endTour();
  }, [activeTour, endTour, updateProgress]);

  if (!definition || definition.steps.length === 0) return null;
  return <TourRunner key={definition.key} tour={definition} onFinish={finish} />;
}
