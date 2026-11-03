import type { RefObject } from 'react';

import { getReact } from '../react.js';

/**
 * Feed the measured sticky-header height into CSS so section jumps land with the
 * weekday heading visible instead of underneath the pinned toolbar.
 * @param fixed - sticky header element.
 * @param scroll - scroll container whose CSS variable is updated.
 */
export function useStickyHeader(
  fixed: RefObject<HTMLDivElement | null>,
  scroll: RefObject<HTMLDivElement | null>
): void {
  const React = getReact();
  React.useEffect(() => {
    const header = fixed.current;
    const root = scroll.current;
    if (header === null || root === null) return;
    const apply = (): void => {
      root.style.setProperty('--agp-sticky-height', `${header.offsetHeight}px`);
    };
    const observer = new ResizeObserver(apply);
    observer.observe(header);
    apply();
    return () => observer.disconnect();
  }, [fixed, scroll]);
}
