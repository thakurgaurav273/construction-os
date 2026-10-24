import { useMemo } from 'react';
import { useCan } from '@/hooks/api/use-access';
import { visibleHelpModules } from '../help-utils';
import type { HelpModule } from '../types';

/** The help modules and guides the signed-in member's role allows. */
export function useVisibleHelpModules(): HelpModule[] {
  const can = useCan();
  return useMemo(() => visibleHelpModules(can), [can]);
}
