import type { RefObject } from 'react';

import { getReact } from '../react.js';

/** Minimal query surface the sentinel needs. */
export interface InfiniteScrollQuery {
  hasNextPage: boolean;
  isFetching: boolean;
  isFetchNextPageError: boolean;
  fetchNextPage: (options?: { cancelRefetch?: boolean }) => Promise<unknown>;
}

/**
 * Auto-load the next page when the sentinel enters the scroll viewport.
 *
 * Ported from `feat/cursor`'s InfiniteScrollSentinel: observe only while idle,
 * keep at least one second between batches, and show a spinner while waiting.
 * @param query - infinite query state.
 * @param scroll - scroll container observed as the sentinel root.
 * @param sentinel - sentinel element at the end of the list.
 * @param enabled - whether the resource list is currently visible.
 * @returns whether the rate-limit wait is in progress.
 */
export function useInfiniteScroll(
  query: InfiniteScrollQuery,
  scroll: RefObject<HTMLDivElement | null>,
  sentinel: RefObject<HTMLDivElement | null>,
  enabled = true
): boolean {
  const React = getReact();
  const [waiting, setWaiting] = React.useState(false);
  const lastAutoLoadAt = React.useRef(-Infinity);

  React.useEffect(() => {
    // Wait for in-flight requests, and leave failed pages to the explicit retry action.
    if (!enabled || !query.hasNextPage || query.isFetching || query.isFetchNextPageError) return;
    const node = sentinel.current;
    const root = scroll.current;
    if (node === null || root === null) return;

    let active = true;
    let requested = false;
    let timer: number | undefined;
    const load = (): void => {
      timer = undefined;
      if (!active) return;
      setWaiting(false);
      lastAutoLoadAt.current = performance.now();
      void query.fetchNextPage({ cancelRefetch: false });
    };
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!active || entry === undefined) return;
        if (!entry.isIntersecting) {
          if (timer !== undefined) {
            window.clearTimeout(timer);
            timer = undefined;
            requested = false;
            setWaiting(false);
          }
          return;
        }
        if (requested) return;
        // Intersection callbacks may repeat before React renders the pending state.
        requested = true;
        const wait = Math.max(0, 1000 - (performance.now() - lastAutoLoadAt.current));
        if (wait > 0) {
          setWaiting(true);
          timer = window.setTimeout(load, wait);
        } else {
          load();
        }
      },
      { root, rootMargin: '300px 0px' }
    );
    observer.observe(node);
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
      setWaiting(false);
      observer.disconnect();
    };
  }, [
    enabled,
    query.hasNextPage,
    query.isFetching,
    query.isFetchNextPageError,
    query.fetchNextPage,
    scroll,
    sentinel
  ]);

  return waiting;
}
