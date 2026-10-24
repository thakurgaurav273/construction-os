import type { Permission, TourKey } from '@sitepilot/types';
import type { TourDefinition } from '../types';
import { MODULE_TOUR_ROUTES, MODULE_TOURS } from './modules';
import { welcomeTour } from './welcome';

/** The tour with only the steps this member's role allows; no steps at all if the module is off limits. */
export function getTour(key: TourKey, can: (permission: Permission) => boolean): TourDefinition {
  const tour = key === 'welcome' ? welcomeTour(can) : MODULE_TOURS[key];
  if (tour.permission && !can(tour.permission)) return { ...tour, steps: [] };
  return { ...tour, steps: tour.steps.filter((step) => !step.permission || can(step.permission)) };
}

export function tourRoute(key: TourKey): string {
  return key === 'welcome' ? '/dashboard' : MODULE_TOUR_ROUTES[key];
}

/** The tour that introduces the page at this exact path, if any. */
export function tourForPath(pathname: string): TourKey | undefined {
  if (pathname === '/dashboard') return 'welcome';
  return (Object.keys(MODULE_TOUR_ROUTES) as (keyof typeof MODULE_TOUR_ROUTES)[])
    .find((key) => MODULE_TOUR_ROUTES[key] === pathname);
}
