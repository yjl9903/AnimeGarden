import type { QueryClient } from '@tanstack/react-query';

import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import type { TranslateFunction } from '../i18n.js';

import { WEB_WEEKDAY, currentWeekdayIndex, rotatedWeekdays } from '../api/bgm.js';
import { trackPageview } from '../api/umami.js';
import { useActiveWeekday } from '../hooks/useActiveWeekday.js';
import { useCalendarData } from '../hooks/useCalendarData.js';
import { useCalendarNavigation } from '../hooks/useCalendarNavigation.js';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll.js';
import { useMagnetCopy } from '../hooks/useMagnetCopy.js';
import { useNavHistory } from '../hooks/useNavHistory.js';
import { usePanelState, usePanelStore } from '../hooks/usePanelStore.js';
import { useResourceSearch } from '../hooks/useResourceSearch.js';
import { useSearchActions } from '../hooks/useSearchActions.js';
import { useStickyHeader } from '../hooks/useStickyHeader.js';
import { getReact } from '../react.js';
import { PANEL_CSS } from '../ui.js';

import { CalendarView } from './CalendarView.js';
import { LoadingStatus } from './LoadingStatus.js';
import { PanelHeader } from './PanelHeader.js';
import { ResourceList } from './ResourceList.js';
import { SearchBar } from './SearchBar.js';
import { Toolbar } from './Toolbar.js';

/** Whether the current view is background-refetching. */
function isRefreshing(
  query: { isFetching: boolean; isPending: boolean; isFetchingNextPage: boolean },
  view: 'search' | 'calendar',
  calendarsFetching: boolean,
  calendarFetching: boolean
): boolean {
  return (
    (query.isFetching && !query.isPending && !query.isFetchingNextPage) ||
    (view === 'calendar' && (calendarsFetching || calendarFetching))
  );
}

/** Refetch the active view's data without touching the navigation history. */
function refreshPanel(
  view: 'search' | 'calendar',
  refetchResources: () => void,
  refetchCalendars: () => void,
  refetchCalendar: () => void
): void {
  refetchResources();
  if (view !== 'calendar') return;
  refetchCalendars();
  refetchCalendar();
}

/** Props the locale-aware slot registration injects into the panel. */
export interface AnimeGardenPanelProps {
  t?: TranslateFunction;
}

/**
 * Build the search panel with the plugin's shared React Query client.
 * @param client - the plugin-owned query client (retry/stale settings in `index.ts`).
 * @returns the component registered into the `main` slot.
 */
export function createAnimeGardenPanel(client: QueryClient) {
  return function AnimeGardenPanel(props: AnimeGardenPanelProps) {
    // Classic JSX emits React.createElement, so the loader-provided runtime must be in scope.
    const React = getReact();
    return (
      <QueryClientProvider client={client}>
        <AnimeGardenPanelContent {...props} />
      </QueryClientProvider>
    );
  };
}

/**
 * Panel shell: owns the store, refs, and the query hooks, and composes the
 * presentational components. Mounted inside {@link QueryClientProvider}.
 * @param props - the translate seat provided by the slot's `locale` option.
 * @returns the search/calendar panel element tree.
 */
function AnimeGardenPanelContent({ t: translate }: AnimeGardenPanelProps) {
  // Classic JSX emits React.createElement, so the loader-provided runtime must be in scope.
  const React = getReact();
  // A missing translate seat must not crash the slot entry; keys are readable fallbacks.
  const t: TranslateFunction = typeof translate === 'function' ? translate : (key: string) => key;

  const store = usePanelStore();
  const scroll = React.useRef<HTMLDivElement | null>(null);
  const fixed = React.useRef<HTMLDivElement | null>(null);
  const sentinel = React.useRef<HTMLDivElement | null>(null);

  const view = usePanelState(store, (state) => state.view);
  const input = usePanelState(store, (state) => state.input);
  const composing = usePanelState(store, (state) => state.composing);
  const hoveredWeekday = usePanelState(store, (state) => state.hoveredWeekday);
  const calendarPending = usePanelState(store, (state) => state.calendarPending);
  const activeWeekday = usePanelState(store, (state) => state.activeWeekday);
  const scrollRequest = usePanelState(store, (state) => state.scrollRequest);

  // One pageview when the plugin panel is entered.
  React.useEffect(() => {
    trackPageview();
  }, []);

  // Rotated broadcast weekdays (index 0 = today's Shanghai broadcast day) plus
  // the upstream WEB bucket at the end, matching the website's calendar.
  const weekdays = React.useMemo(
    () => [...rotatedWeekdays(currentWeekdayIndex()), WEB_WEEKDAY],
    []
  );

  const nav = useNavHistory(store, scroll);
  const search = useResourceSearch(store, nav.recordNav);
  const calendar = useCalendarData(store, nav.recordNav, scroll);
  const actions = useSearchActions(store, search.parsed, nav.recordNav);
  const loadMoreWaiting = useInfiniteScroll(
    search.query,
    scroll,
    sentinel,
    view === 'search' && !calendarPending
  );
  const copyMagnet = useMagnetCopy(t);

  useStickyHeader(fixed, scroll);
  useActiveWeekday(store, scroll, fixed, view, weekdays, calendar.calendarSubjects);

  // A new filter starts reading from the top of the scroll container.
  React.useEffect(() => {
    if (scroll.current !== null) scroll.current.scrollTop = 0;
  }, [search.filter]);

  const navigation = useCalendarNavigation(store, scroll, calendar.calendarReady, nav.recordNav);

  // Show interaction feedback while a refetch runs (not for the first load or the
  // infinite-scroll batches, which have their own indicators).
  const refreshing = isRefreshing(
    search.query,
    view,
    calendar.calendarsQuery.isFetching,
    calendar.calendarQuery.isFetching
  );
  const loading = search.query.isPending || refreshing;
  const errorMessage =
    search.query.error instanceof Error
      ? search.query.error.message
      : String(search.query.error ?? '');

  return (
    <div className="agp-root">
      <style>{PANEL_CSS}</style>
      <div className="agp-scroll" ref={scroll}>
        <div className="agp-page">
          <div className="agp-fixed" ref={fixed}>
            <PanelHeader t={t} />
            <SearchBar
              t={t}
              value={input}
              onInput={store.setInput}
              onComposingChange={store.setComposing}
              onTyping={search.markTyped}
              onSubmit={search.submitSearch}
            />
            <Toolbar
              t={t}
              view={view}
              onToggleCalendar={navigation.toggleCalendar}
              weekdays={weekdays}
              calendarSubjects={calendar.calendarBuckets}
              calendarLoading={calendar.calendarLoading}
              calendarPending={calendarPending}
              activeWeekday={view === 'calendar' ? activeWeekday : null}
              hoveredWeekday={hoveredWeekday}
              onHoverWeekday={store.setHoveredWeekday}
              onSelectWeekday={navigation.selectWeekday}
              onSelectAnime={actions.openSubject}
              canGoBack={nav.canGoBack}
              canGoForward={nav.canGoForward}
              onBack={() => nav.goBack(calendar.calendarReady)}
              onForward={() => nav.goForward(calendar.calendarReady)}
              onRefresh={() =>
                refreshPanel(
                  view,
                  () => void search.query.refetch(),
                  () => void calendar.calendarsQuery.refetch(),
                  () => {
                    if (calendar.season !== undefined) void calendar.calendarQuery.refetch();
                  }
                )
              }
              refreshing={refreshing}
              selectedTypes={search.parsed.types}
              onChangeTypes={actions.applyTypes}
              selectedFansubs={search.parsed.fansubs}
              onChangeFansubs={actions.applyFansubs}
            />
          </div>
          {view === 'search' ? (
            <section
              className="agp-results"
              aria-live="polite"
              aria-busy={loading || calendarPending}
            >
              {calendarPending ? (
                <LoadingStatus label={t('loadingCalendar')} />
              ) : (
                <ResourceList
                  t={t}
                  resources={search.resources}
                  pending={search.query.isPending || refreshing}
                  isError={search.query.isError}
                  errorMessage={errorMessage}
                  hasNextPage={search.query.hasNextPage}
                  isFetchNextPageError={search.query.isFetchNextPageError}
                  isFetchingNextPage={search.query.isFetchingNextPage}
                  loadMoreWaiting={loadMoreWaiting}
                  sentinelRef={sentinel}
                  onRetry={() => void search.query.refetch()}
                  onRetryNextPage={() => void search.query.fetchNextPage()}
                  onRefineFansub={actions.refineFansub}
                  onCopyMagnet={(magnet) => void copyMagnet(magnet)}
                />
              )}
            </section>
          ) : refreshing ? (
            <LoadingStatus label={t('loadingCalendar')} />
          ) : (
            <CalendarView
              t={t}
              season={calendar.season}
              subjects={calendar.calendarSubjects}
              web={calendar.calendarWeb}
              scrollRequest={scrollRequest}
              onSelectSubject={actions.openSubject}
            />
          )}
        </div>
      </div>
      <Toaster position="bottom-right" theme="system" />
    </div>
  );
}
