import type { RefObject } from 'react';

import { getReact } from '../react.js';
import type { PanelNavEntry, PanelStore } from '../stores/panel.js';

import { usePanelState } from './usePanelStore.js';

/**
 * Calendar/search view switching, kept out of the panel shell so the component
 * stays a thin composition root.
 * @param store - panel store.
 * @param scroll - results scroll container.
 * @param calendarReady - whether the calendar payload is loaded.
 * @param recordNav - history recorder provided by {@link useNavHistory}.
 * @returns the toggle and weekday-select callbacks used by the toolbar.
 */
export function useCalendarNavigation(
  store: PanelStore,
  scroll: RefObject<HTMLDivElement | null>,
  calendarReady: boolean,
  recordNav: (entry: Omit<PanelNavEntry, 'scrollTop'>) => void
) {
  const React = getReact();
  const view = usePanelState(store, (state) => state.view);
  const calendarPending = usePanelState(store, (state) => state.calendarPending);
  const activeWeekday = usePanelState(store, (state) => state.activeWeekday);

  const recordSearchNav = React.useCallback((): void => {
    recordNav({
      view: 'search',
      query: store.store.state.submitted,
      subjectId: store.store.state.subjectFilter
    });
  }, [recordNav, store]);

  const recordCalendarNav = React.useCallback((): void => {
    recordNav({
      view: 'calendar',
      query: store.store.state.submitted,
      subjectId: store.store.state.subjectFilter
    });
  }, [recordNav, store]);

  /** Toggle between the resource list and the calendar view once data is ready. */
  const toggleCalendar = React.useCallback((): void => {
    store.setHoveredWeekday(null);
    store.setScrollRequest(null);
    if (view === 'calendar') {
      store.openSearchView();
      recordSearchNav();
      return;
    }
    if (calendarPending) {
      store.setCalendarPending(false);
      return;
    }
    if (calendarReady) {
      store.openCalendarView();
      if (scroll.current !== null) scroll.current.scrollTop = 0;
      recordCalendarNav();
      return;
    }
    store.setCalendarPending(true);
  }, [calendarPending, calendarReady, recordCalendarNav, recordSearchNav, scroll, store, view]);

  /**
   * Week chip: scroll to its section, or close the calendar page when the view
   * is already parked on that weekday.
   */
  const selectWeekday = React.useCallback(
    (weekday: number): void => {
      store.setHoveredWeekday(null);
      if (view === 'calendar' && activeWeekday === weekday) {
        store.openSearchView();
        recordSearchNav();
        return;
      }
      store.setScrollRequest({ weekday, nonce: Date.now() });
      if (view === 'calendar') return;
      if (calendarReady) {
        store.openCalendarView();
        recordCalendarNav();
        return;
      }
      store.setCalendarPending(true);
    },
    [activeWeekday, calendarReady, recordCalendarNav, recordSearchNav, store, view]
  );

  return { toggleCalendar, selectWeekday };
}
