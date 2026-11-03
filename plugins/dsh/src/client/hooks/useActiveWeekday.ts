import type { RefObject } from 'react';

import type { CalendarSubject } from '../api/bgm.js';
import { getReact } from '../react.js';
import type { PanelStore } from '../stores/panel.js';
import type { PanelView } from '../stores/panel.js';

import { usePanelState } from './usePanelStore.js';

/**
 * Track the weekday section currently sitting under the sticky header, so a chip
 * click can distinguish "scroll there" from "already there, close".
 * @param store - panel store (receives the active weekday).
 * @param scroll - calendar scroll container.
 * @param fixed - sticky header element used as the visibility threshold.
 * @param view - current panel view (only tracked while calendar is shown).
 * @param weekdays - weekday indexes in display order.
 * @param calendarSubjects - fetched calendar buckets, a dependency for re-measure.
 */
export function useActiveWeekday(
  store: PanelStore,
  scroll: RefObject<HTMLDivElement | null>,
  fixed: RefObject<HTMLDivElement | null>,
  view: PanelView,
  weekdays: number[],
  calendarSubjects: CalendarSubject[][] | undefined
): void {
  const React = getReact();
  React.useEffect(() => {
    const root = scroll.current;
    if (view !== 'calendar' || root === null) return;
    const update = (): void => {
      // Section jumps land at stickyHeight + 16px (the CSS scroll-margin), so the
      // hit area must extend a little further or the previous section stays active.
      const threshold =
        root.getBoundingClientRect().top + (fixed.current?.offsetHeight ?? 148) + 24;
      let current: number | null = null;
      for (const weekday of weekdays) {
        const node = document.getElementById(`agp-weekday-${weekday}`);
        if (node !== null && node.getBoundingClientRect().top <= threshold) current = weekday;
      }
      store.setActiveWeekday(current);
    };
    update();
    root.addEventListener('scroll', update, { passive: true });
    return () => root.removeEventListener('scroll', update);
  }, [view, weekdays, calendarSubjects, store, scroll, fixed]);
}
