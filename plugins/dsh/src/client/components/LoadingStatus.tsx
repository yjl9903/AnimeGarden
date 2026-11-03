import { getReact } from '../react.js';

/** Lucide `loader-circle` arc used by every loading state in the panel. */
export function LoaderIcon({ size = 20 }: { size?: number }) {
  const React = getReact();
  return (
    <svg
      className="agp-spinner"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

/**
 * Shared loading row: the centered spinner ported from `feat/cursor`'s
 * `InfiniteScrollSentinel`, reused by the initial search, load-more and calendar
 * hover states so every loading UI looks the same.
 * @param label - accessible label for the status region.
 * @returns the status element tree.
 */
export function LoadingStatus({ label }: { label: string }) {
  const React = getReact();
  return (
    <div className="agp-loadmore-status" role="status" aria-label={label}>
      <LoaderIcon />
    </div>
  );
}
