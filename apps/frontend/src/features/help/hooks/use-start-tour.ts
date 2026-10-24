import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { TourKey } from '@sitepilot/types';
import { useHelpStore } from '@/store/help.store';
import { tourRoute } from '../tours';

/** Starts a tour on its own page, navigating there first when needed (the tour waits for the page). */
export function useStartTour(): (tour: TourKey) => void {
  const router = useRouter();
  const pathname = usePathname();
  const startTour = useHelpStore((state) => state.startTour);
  return useCallback((tour: TourKey) => {
    const route = tourRoute(tour);
    if (pathname !== route) router.push(route);
    startTour(tour);
  }, [pathname, router, startTour]);
}
