export interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface CardPosition {
  top: number;
  left: number;
  width: number;
}

const SPOTLIGHT_PADDING = 6;
const GAP = 12;
const EDGE = 16;
const CARD_WIDTH = 340;
/** Below this width the card spans the screen (keeping clear of toasts at the bottom). */
const FULL_WIDTH_BELOW = 640;

/**
 * The visible element marked `data-tour="<target>"`; 'hidden' when it is rendered but not shown at this
 * screen size (e.g. the sidebar on a phone); null when it isn't rendered (yet).
 */
export function findTourTarget(target: string): HTMLElement | 'hidden' | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`));
  if (candidates.length === 0) return null;
  return candidates.find((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }) ?? 'hidden';
}

export function spotlightRect(element: HTMLElement): TargetRect {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top - SPOTLIGHT_PADDING,
    left: rect.left - SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
  };
}

/** Beside tall targets (the sidebar), otherwise below them, or above when there's no room below. */
export function cardPosition(target: TargetRect | null, cardHeight: number): CardPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = viewportWidth < FULL_WIDTH_BELOW ? viewportWidth - EDGE * 2 : Math.min(CARD_WIDTH, viewportWidth - EDGE * 2);
  if (!target) return { top: Math.max(EDGE, (viewportHeight - cardHeight) / 2), left: (viewportWidth - width) / 2, width };

  const clampLeft = (left: number): number => Math.min(Math.max(EDGE, left), viewportWidth - width - EDGE);
  const clampTop = (top: number): number => Math.min(Math.max(EDGE, top), viewportHeight - cardHeight - EDGE);

  if (target.height > viewportHeight * 0.5) {
    return { top: clampTop(target.top + target.height / 2 - cardHeight / 2), left: clampLeft(target.left + target.width + GAP), width };
  }
  const below = target.top + target.height + GAP;
  const top = below + cardHeight <= viewportHeight - EDGE ? below : target.top - GAP - cardHeight;
  return { top: clampTop(top), left: clampLeft(target.left + target.width / 2 - width / 2), width };
}
