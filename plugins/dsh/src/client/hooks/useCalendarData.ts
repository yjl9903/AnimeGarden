import type { RefObject } from 'react';

import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { fetchCalendar, fetchCalendarSeasons, pickActiveSeason } from '../api/bgm.js';
import type { CalendarSubject } from '../api/bgm.js';
import { getReact } from '../react.js';
import type { PanelNavEntry, PanelStore } from '../stores/panel.js';

import { usePanelState } from './usePanelStore.js';

/** Turn an unknown query error into the message toast renders. */
function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? '');
}

/**
 * Calendar queries plus the deferred "show calendar when ready" hand-off.
 *
 * Data is requested only when the calendar view, a weekday hover list, or a
 * pending switch needs it, and stays cached for five minutes.
 * @param store - panel store.
 * @param recordNav - history recorder provided by {@link useNavHistory}.
 * @param scroll - results scroll container, reset when the calendar opens.
 * @returns season/bucket data and query state used by the toolbar and view.
 */
export function useCalendarData(
  store: PanelStore,
  recordNav: (entry: Omit<PanelNavEntry, 'scrollTop'>) => void,
  scroll: RefObject<HTMLDivElement | null>
) {
  const React = getReact();
  const view = usePanelState(store, (state) => state.view);
  const hoveredWeekday = usePanelState(store, (state) => state.hoveredWeekday);
  const calendarPending = usePanelState(store, (state) => state.calendarPending);
  const submitted = usePanelState(store, (state) => state.submitted);
  const subjectFilter = usePanelState(store, (state) => state.subjectFilter);

  const calendarEnabled = view === 'calendar' || hoveredWeekday !== null || calendarPending;
  const calendarsQuery = useQuery({
    queryKey: ['animegarden', 'calendars'],
    queryFn: ({ signal }) => fetchCalendarSeasons(signal),
    enabled: calendarEnabled,
    staleTime: 5 * 60 * 1000
  });
  const season =
    calendarsQuery.data === undefined ? undefined : pickActiveSeason(calendarsQuery.data);
  const calendarQuery = useQuery({
    queryKey: ['animegarden', 'calendar', season ?? ''],
    queryFn: ({ signal }) => fetchCalendar(season as string, signal),
    enabled: calendarEnabled && season !== undefined,
    staleTime: 5 * 60 * 1000
  });

  const calendarSubjects: CalendarSubject[][] | undefined = calendarQuery.data?.calendar;
  const calendarWeb: CalendarSubject[] | undefined = calendarQuery.data?.web;
  // Hover lists index by weekday, so append the WEB bucket for the WEB chip.
  const calendarBuckets: CalendarSubject[][] | undefined =
    calendarSubjects === undefined ? undefined : [...calendarSubjects, calendarWeb ?? []];
  const calendarReady =
    calendarsQuery.data !== undefined && season !== undefined && calendarQuery.data !== undefined;
  const calendarLoading =
    calendarEnabled &&
    (calendarsQuery.isPending || (season !== undefined && calendarQuery.isPending));

  // Only reveal the calendar once the season directory and payload are ready, so
  // the view never flashes a loading placeholder.
  React.useEffect(() => {
    if (!calendarPending) return;
    if (calendarReady) {
      store.openCalendarView();
      if (scroll.current !== null) scroll.current.scrollTop = 0;
      recordNav({ view: 'calendar', query: submitted, subjectId: subjectFilter });
      return;
    }
    if (calendarsQuery.isError || calendarQuery.isError) {
      store.setCalendarPending(false);
      toast.error(errorText(calendarsQuery.error ?? calendarQuery.error));
    }
  }, [
    calendarPending,
    calendarReady,
    calendarsQuery.isError,
    calendarsQuery.error,
    calendarQuery.isError,
    calendarQuery.error,
    store,
    scroll,
    recordNav,
    submitted,
    subjectFilter
  ]);

  return {
    calendarsQuery,
    calendarQuery,
    season,
    calendarSubjects,
    calendarWeb,
    calendarBuckets,
    calendarReady,
    calendarLoading
  };
}
