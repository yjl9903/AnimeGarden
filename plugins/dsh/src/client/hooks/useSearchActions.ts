import { setSearchFilters } from '../../../../../apps/web/src/layouts/Search/parse';

import { calendarLabel } from '../api/bgm.js';
import { track } from '../api/umami.js';
import { getReact } from '../react.js';
import type { PanelNavEntry, PanelStore } from '../stores/panel.js';

/**
 * Rewrite actions that keep the search box and the parsed filters in sync.
 * @param store - panel store.
 * @param parsed - parsed search syntax of the committed query.
 * @param recordNav - history recorder provided by {@link useNavHistory}.
 * @returns filter, fan-sub, and subject navigation callbacks.
 */
export function useSearchActions(
  store: PanelStore,
  parsed: { fansubs: string[]; types: string[] },
  recordNav: (entry: Omit<PanelNavEntry, 'scrollTop'>) => void
) {
  const React = getReact();
  const fanSubSet = React.useMemo(() => new Set(parsed.fansubs), [parsed.fansubs]);
  const typeSet = React.useMemo(() => new Set(parsed.types), [parsed.types]);

  /** Apply a rewritten query to both the search box and the results below it. */
  const applyQuery = React.useCallback(
    (query: string, nextSubject?: number | null): void => {
      store.commitSearch(query, nextSubject);
      recordNav({ view: 'search', query, subjectId: store.store.state.subjectFilter });
    },
    [store, recordNav]
  );

  /** Toolbar fan-sub dropdown: rewrite the `字幕组:` tokens in the search text. */
  const applyFansubs = React.useCallback(
    (next: string[]): void => {
      for (const value of next) {
        if (!fanSubSet.has(value)) {
          track('resources.filter.click', { filterType: 'fansub', value });
        }
      }
      applyQuery(setSearchFilters(store.store.state.input, { fansubs: next }));
    },
    [applyQuery, fanSubSet, store]
  );

  /** Toolbar type dropdown: rewrite the `类型:` tokens in the search text. */
  const applyTypes = React.useCallback(
    (next: string[]): void => {
      for (const value of next) {
        if (!typeSet.has(value)) {
          track('resources.filter.click', { filterType: 'type', value });
        }
      }
      applyQuery(setSearchFilters(store.store.state.input, { types: next }));
    },
    [applyQuery, typeSet, store]
  );

  /** Row tag: refine the current results to a single fan-sub. */
  const refineFansub = React.useCallback(
    (name: string): void => {
      track('resources.filter.click', { filterType: 'fansub', value: name });
      applyQuery(setSearchFilters(store.store.state.input, { fansubs: [name] }));
    },
    [applyQuery, store]
  );

  /** Calendar card or hover list: filter the resource list by that Bangumi subject. */
  const openSubject = React.useCallback(
    (subjectId: number, title: string, weekday: number): void => {
      track('anime.calendar.click', {
        subjectId: String(subjectId),
        title,
        weekday: calendarLabel(weekday)
      });
      // Show the anime name instead of the numeric subject id (the id still drives
      // the request filter); keep the other token groups already in the search box.
      const query = setSearchFilters(store.store.state.input, { subjects: [title] });
      store.setHoveredWeekday(null);
      applyQuery(query, subjectId);
    },
    [applyQuery, store]
  );

  return { applyQuery, applyFansubs, applyTypes, refineFansub, openSubject };
}
