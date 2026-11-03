import type { RefObject } from 'react';

import { getReact } from '../react.js';
import type { PanelNavEntry } from '../stores/panel.js';
import type { PanelStore } from '../stores/panel.js';

import { usePanelState } from './usePanelStore.js';

/**
 * Browser-like in-panel history: record snapshots, move the cursor, and restore
 * the saved scroll offset after the target view renders.
 * @param store - panel store.
 * @param scroll - results scroll container (source of the recorded offset).
 * @returns history flags plus the navigation callbacks.
 */
export function useNavHistory(store: PanelStore, scroll: RefObject<HTMLDivElement | null>) {
  const React = getReact();
  const index = usePanelState(store, (state) => state.nav.index);
  const length = usePanelState(store, (state) => state.nav.entries.length);
  const pendingScroll = usePanelState(store, (state) => state.pendingScroll);
  const view = usePanelState(store, (state) => state.view);
  const submitted = usePanelState(store, (state) => state.submitted);

  /** Record a snapshot with the current scroll offset. */
  const recordNav = React.useCallback(
    (entry: Omit<PanelNavEntry, 'scrollTop'>): void => {
      store.recordNav(entry, scroll.current?.scrollTop ?? 0);
    },
    [store, scroll]
  );

  /**
   * Apply one stored snapshot without recording it again. A target calendar view
   * is deferred when its data is not ready yet.
   * @param target - index into the history entries.
   * @param calendarReady - whether the calendar payload is loaded.
   */
  const goToNav = React.useCallback(
    (target: number, calendarReady: boolean): void => {
      const entry = store.store.state.nav.entries[target];
      if (entry === undefined) return;
      store.setNavIndex(target);
      store.store.setState((state) => ({
        ...state,
        input: entry.query,
        submitted: entry.query,
        subjectFilter: entry.subjectId,
        hoveredWeekday: null,
        scrollRequest: null,
        calendarPending: false,
        pendingScroll: entry.scrollTop,
        view: 'search'
      }));
      if (entry.view !== 'calendar') return;
      if (calendarReady) {
        store.setView('calendar');
      } else {
        store.setCalendarPending(true);
      }
    },
    [store]
  );

  const goBack = React.useCallback(
    (calendarReady: boolean): void => {
      const current = store.store.state.nav.index;
      if (current > 0) goToNav(current - 1, calendarReady);
    },
    [store, goToNav]
  );

  const goForward = React.useCallback(
    (calendarReady: boolean): void => {
      const state = store.store.state.nav;
      if (state.index < state.entries.length - 1) goToNav(state.index + 1, calendarReady);
    },
    [store, goToNav]
  );

  // Restore the saved offset after the navigation-induced render.
  React.useEffect(() => {
    if (pendingScroll === null) return;
    store.setPendingScroll(null);
    if (scroll.current !== null) scroll.current.scrollTop = pendingScroll;
  }, [pendingScroll, view, submitted, scroll, store]);

  return {
    canGoBack: index > 0,
    canGoForward: index < length - 1,
    recordNav,
    goBack,
    goForward
  };
}
