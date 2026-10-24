'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button, cn } from '@sitepilot/ui';
import type { TourStatus } from '@sitepilot/types';
import type { TourDefinition } from '../types';
import { CardPosition, TargetRect, cardPosition, findTourTarget, spotlightRect } from '../tour-geometry';

/**
 * Pages render their actions after data loads, so a missing target is retried before skipping it: longer
 * while the page may still be loading, briefly once an earlier step has found its target.
 */
const FIRST_TARGET_WAIT_MS = 2500;
const LATER_TARGET_WAIT_MS = 600;
const TARGET_POLL_MS = 100;
const ESTIMATED_CARD_HEIGHT = 200;

interface TourRunnerProps {
  tour: TourDefinition;
  onFinish: (status: TourStatus) => void;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function TourRunner({ tour, onFinish }: TourRunnerProps): React.ReactPortal | null {
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [rect, setRect] = useState<TargetRect | null>(null);
  const [position, setPosition] = useState<CardPosition | null>(null);
  const [skipped, setSkipped] = useState<Set<number>>(() => new Set());
  const direction = useRef<1 | -1>(1);
  const foundAnyTarget = useRef(false);
  const onFinishRef = useRef(onFinish);
  useLayoutEffect(() => { onFinishRef.current = onFinish; });
  const targetElement = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const step = tour.steps[index];

  const finish = useCallback((status: TourStatus) => onFinishRef.current(status), []);

  const go = useCallback((next: number, travel: 1 | -1) => {
    direction.current = travel;
    if (next >= tour.steps.length) { finish('COMPLETED'); return; }
    setReady(false);
    setIndex(Math.max(0, next));
  }, [finish, tour.steps.length]);

  // Find this step's target, waiting for the page to render it; skip the step if it never appears.
  useEffect(() => {
    if (!step) return;
    targetElement.current = null;
    if (!step.target) { setRect(null); setReady(true); return; }
    const target = step.target;
    const startedAt = Date.now();
    const waitMs = foundAnyTarget.current ? LATER_TARGET_WAIT_MS : FIRST_TARGET_WAIT_MS;
    const skipStep = (): void => {
      setSkipped((current) => new Set(current).add(index));
      const next = index + direction.current;
      if (next < 0) go(index + 1, 1);
      else go(next, direction.current);
    };
    const locate = (): boolean => {
      const element = findTourTarget(target);
      if (element === 'hidden') { skipStep(); return true; }
      if (element) {
        foundAnyTarget.current = true;
        targetElement.current = element;
        element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        setRect(spotlightRect(element));
        setReady(true);
        return true;
      }
      if (Date.now() - startedAt > waitMs) { skipStep(); return true; }
      return false;
    };
    if (locate()) return;
    const timer = window.setInterval(() => { if (locate()) window.clearInterval(timer); }, TARGET_POLL_MS);
    return () => window.clearInterval(timer);
  }, [step, index, go]);

  // Follow the target as the page scrolls or resizes (including the smooth scroll into view).
  useEffect(() => {
    if (!ready) return;
    const measure = (): void => {
      if (targetElement.current) setRect(spotlightRect(targetElement.current));
      else setRect(null);
    };
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [ready]);

  useLayoutEffect(() => {
    if (!ready) return;
    setPosition(cardPosition(rect, cardRef.current?.offsetHeight ?? ESTIMATED_CARD_HEIGHT));
  }, [ready, rect]);

  // Once per step, as soon as the card is positioned (a hidden card can't take focus).
  const focusedStep = useRef<number | null>(null);
  useEffect(() => {
    if (!ready || !position || focusedStep.current === index) return;
    focusedStep.current = index;
    primaryRef.current?.focus();
  }, [ready, position, index]);

  // Escape leaves, arrows move, and Tab stays inside the card.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') { event.preventDefault(); finish('SKIPPED'); return; }
      if (!ready) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); go(index + 1, 1); return; }
      if (event.key === 'ArrowLeft' && index > 0) { event.preventDefault(); go(index - 1, -1); return; }
      if (event.key !== 'Tab' || !cardRef.current) return;
      const focusable = Array.from(cardRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const inside = cardRef.current.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || !inside)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !inside)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [finish, go, index, ready]);

  if (!step || typeof document === 'undefined') return null;

  const shownSteps = tour.steps.length - skipped.size;
  const shownIndex = index - Array.from(skipped).filter((skippedIndex) => skippedIndex < index).length;
  const isLast = tour.steps.slice(index + 1).length === 0;
  const motion = 'transition-all duration-200 ease-out motion-reduce:transition-none';

  return createPortal(
    <div className="fixed inset-0 z-[70]" aria-live="polite">
      {/* Clicks on the page are blocked while the tour runs; the card is the only thing to interact with. */}
      <div className={cn('absolute inset-0', (!ready || !rect) && 'bg-black/50')} />
      {ready && rect && (
        <div
          aria-hidden="true"
          className={cn('pointer-events-none absolute rounded-lg ring-2 ring-primary', motion)}
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.5)' }}
        />
      )}
      {ready && (
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-step-title"
          aria-describedby="tour-step-body"
          className={cn('absolute rounded-xl border bg-popover p-4 text-popover-foreground shadow-xl', motion, !position && 'opacity-0')}
          style={position ?? undefined}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground">{tour.title} · {shownIndex + 1} of {shownSteps}</p>
            <button
              type="button"
              onClick={() => finish('SKIPPED')}
              aria-label="Close tour"
              className="-m-1 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <h2 id="tour-step-title" className="mt-1.5 font-semibold">{step.title}</h2>
          <p id="tour-step-body" className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => finish('SKIPPED')}>Skip tour</Button>
            <div className="flex gap-2">
              {index > 0 && <Button variant="outline" size="sm" onClick={() => go(index - 1, -1)}>Back</Button>}
              <Button ref={primaryRef} size="sm" onClick={() => go(index + 1, 1)}>{isLast ? 'Done' : 'Next'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
