import { stringifyURLSearch, type ResolvedFilterOptions } from '@animegarden/client';
import { Link, useLocation } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

import { getResourcesRouteLink } from '~/utils/routes';
import { trackResourcesLoadMoreClick } from '~/utils/umami';

export interface LoadMoreProps {
  complete?: boolean;
  isLoadingMore?: boolean;
  hasLoadMoreError?: boolean;
  onLoadMore?: () => unknown | Promise<unknown>;
}

const loadMoreContainerClassName = 'mt-6 flex justify-center';
const loadMoreTextClassName = 'text-link text-base';
const autoLoadMinIntervalMs = 1000;

/** Observe the list tail only while idle; remeasure after each batch instead of draining off-screen pages. */
export function InfiniteScrollSentinel({
  complete,
  isLoadingMore,
  hasLoadMoreError,
  onLoadMore
}: LoadMoreProps) {
  const sentinel = useRef<HTMLDivElement>(null);
  const lastAutoLoadAt = useRef(-Infinity);
  const [isWaiting, setIsWaiting] = useState(false);

  useEffect(() => {
    const element = sentinel.current;
    if (!element || complete || isLoadingMore || hasLoadMoreError || !onLoadMore) return;

    let active = true;
    let requested = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = () => {
      timer = undefined;
      if (!active) return;
      setIsWaiting(false);
      lastAutoLoadAt.current = performance.now();
      void onLoadMore();
    };
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1);
        if (!active || !entry) return;
        if (!entry.isIntersecting) {
          if (timer !== undefined) {
            clearTimeout(timer);
            timer = undefined;
            requested = false;
            setIsWaiting(false);
          }
          return;
        }
        if (requested) return;
        // Intersection callbacks may repeat before React renders the pending query state.
        requested = true;
        // Count request time toward the interval: slow batches do not incur another full delay.
        const wait = Math.max(
          0,
          autoLoadMinIntervalMs - (performance.now() - lastAutoLoadAt.current)
        );
        if (wait > 0) {
          setIsWaiting(true);
          timer = setTimeout(load, wait);
        } else {
          load();
        }
      },
      { rootMargin: '300px 0px' }
    );
    observer.observe(element);
    return () => {
      active = false;
      clearTimeout(timer);
      setIsWaiting(false);
      observer.disconnect();
    };
  }, [complete, isLoadingMore, hasLoadMoreError, onLoadMore]);

  if (complete || !onLoadMore) return null;

  return (
    <div
      ref={sentinel}
      className={`${loadMoreContainerClassName} min-h-1`}
      aria-busy={isLoadingMore || isWaiting}
    >
      {isLoadingMore || isWaiting ? (
        <div role="status" aria-label="加载中" className="flex items-center justify-center py-2">
          <LoaderCircle
            className="size-5 animate-spin motion-reduce:animate-none text-sky-700"
            aria-hidden="true"
          />
        </div>
      ) : hasLoadMoreError ? (
        <div role="alert" className="flex items-center justify-center gap-2 py-2 text-base">
          <span className="i-carbon-error size-4 shrink-0 text-red-700/80" aria-hidden="true" />
          <span className="text-red-700/80">资源加载失败</span>
          <button type="button" className={loadMoreTextClassName} onClick={() => void onLoadMore()}>
            重试
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Links from a resource preview batch to its full list using the resolved server filter. */
export function ResourcesLoadMoreLink({ filter }: { filter: ResolvedFilterOptions }) {
  const location = useLocation();

  return (
    <div className="mt-6 flex justify-end">
      <Link
        {...getResourcesRouteLink(stringifyURLSearch(filter))}
        className={loadMoreTextClassName}
        onClick={() =>
          trackResourcesLoadMoreClick({
            path: location.pathname,
            search: location.searchStr,
            kind: 'link'
          })
        }
      >
        → 全部资源
      </Link>
    </div>
  );
}
