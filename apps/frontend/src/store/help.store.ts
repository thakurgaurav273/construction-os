import { create } from 'zustand';
import type { TourKey } from '@sitepilot/types';

/**
 * Help can be opened from the header, account menu, ⌘K, empty states and "?" links anywhere in the page
 * tree, and a tour overlays whatever page is showing, so this UI state is global.
 */
interface HelpState {
  isOpen: boolean;
  /** Guide to show when the center opens; null opens on the current page's module. */
  guideId: string | null;
  activeTour: TourKey | null;
  openHelp: (guideId?: string) => void;
  closeHelp: () => void;
  startTour: (tour: TourKey) => void;
  endTour: () => void;
}

export const useHelpStore = create<HelpState>()((set) => ({
  isOpen: false,
  guideId: null,
  activeTour: null,
  openHelp: (guideId) => set({ isOpen: true, guideId: guideId ?? null, activeTour: null }),
  closeHelp: () => set({ isOpen: false }),
  startTour: (tour) => set({ activeTour: tour, isOpen: false }),
  endTour: () => set({ activeTour: null }),
}));
