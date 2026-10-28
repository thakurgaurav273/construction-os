'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Skeleton, cn } from '@sitepilot/ui';

/**
 * Lists on phones (ADR-051): tables stay as tables from `md` up; below that the same rows show as cards
 * in a single scroll that loads more as you reach the end, instead of a squeezed table and page buttons.
 */

interface MobileCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Top-right: usually a status badge or the amount. */
  aside?: React.ReactNode;
  /** Label/value pairs shown two per row under the title. */
  meta?: { label: string; value: React.ReactNode }[];
  /** Extra content under the details, e.g. buttons. */
  footer?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function MobileCard({ title, subtitle, aside, meta, footer, href, onClick, className }: MobileCardProps): React.ReactElement {
  const interactive = Boolean(href || onClick);
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{title}</div>
          {subtitle && <div className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</div>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {aside}
          {interactive && <ChevronRight className="h-4 w-4 text-muted-foreground/60" aria-hidden="true" />}
        </div>
      </div>
      {meta && meta.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
          {meta.map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{item.label}</dt>
              <dd className="truncate text-sm">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {footer && <div className="mt-3">{footer}</div>}
    </>
  );
  const cardClass = cn('block rounded-xl border bg-card p-4 text-left shadow-sm', interactive && 'transition-colors active:bg-muted/60', className);
  if (href) return <Link href={href} className={cardClass}>{body}</Link>;
  // A card with its own buttons in the footer can't be a <button> itself, so it behaves like one instead.
  if (onClick && footer) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
          event.preventDefault();
          onClick();
        }}
        className={cn(cardClass, 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}
      >
        {body}
      </div>
    );
  }
  if (onClick) return <button type="button" onClick={onClick} className={cn(cardClass, 'w-full')}>{body}</button>;
  return <div className={cardClass}>{body}</div>;
}

interface MobileCardListProps<T> {
  items: readonly T[];
  getKey: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  /** Shown when there are no items. */
  empty?: React.ReactNode;
  className?: string;
}

/** The phone half of a list: cards that load the next batch when the end scrolls into view. */
export function MobileCardList<T>({
  items, getKey, renderCard, hasMore = false, onLoadMore, isLoadingMore = false, empty, className,
}: MobileCardListProps<T>): React.ReactElement {
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore || !onLoadMore || isLoadingMore) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
    }, { rootMargin: '400px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, isLoadingMore, items.length]);

  if (items.length === 0 && empty) return <div className={cn('md:hidden', className)}>{empty}</div>;
  return (
    <div className={cn('space-y-3 md:hidden', className)}>
      {items.map((item) => <React.Fragment key={getKey(item)}>{renderCard(item)}</React.Fragment>)}
      {hasMore && (
        <div ref={sentinel} className="space-y-3" aria-hidden="true">
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}

/**
 * For lists already fully loaded: reveals them a batch at a time as the user scrolls. `resetKey` (filters,
 * search) starts again from the top.
 */
export function useIncrementalItems<T>(items: readonly T[], resetKey: string, batchSize = 20): { visible: readonly T[]; hasMore: boolean; loadMore: () => void } {
  const [count, setCount] = useState(batchSize);
  useEffect(() => setCount(batchSize), [resetKey, batchSize]);
  return {
    visible: useMemo(() => items.slice(0, count), [items, count]),
    hasMore: count < items.length,
    loadMore: () => setCount((current) => current + batchSize),
  };
}

/**
 * For lists the server pages: keeps every page fetched so far, so the phone list grows while the desktop
 * table still shows one page. `resetKey` (filters, search) starts it over.
 */
export function useAccumulatedPages<T>({ items, page, resetKey }: { items: readonly T[] | undefined; page: number; resetKey: string }): readonly T[] {
  const [pages, setPages] = useState<{ key: string; byPage: Map<number, readonly T[]> }>({ key: resetKey, byPage: new Map() });

  useEffect(() => {
    if (!items) return;
    setPages((current) => {
      const byPage = new Map(current.key === resetKey && page !== 1 ? current.byPage : []);
      byPage.set(page, items);
      return { key: resetKey, byPage };
    });
  }, [items, page, resetKey]);

  return useMemo(() => {
    if (pages.key !== resetKey) return items ?? [];
    return [...pages.byPage.entries()].sort(([a], [b]) => a - b).flatMap(([, pageItems]) => pageItems);
  }, [pages, resetKey, items]);
}
