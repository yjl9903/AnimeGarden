import type { FormEvent } from 'react';

import { useInfiniteQuery } from '@tanstack/react-query';

import { parseSearchInput } from '../../../../../apps/web/src/layouts/Search/parse';

import { createResourceFilter, requestResources } from '../api/animegarden.js';
import { track } from '../api/umami.js';
import { getReact } from '../react.js';
import type { PanelNavEntry, PanelStore } from '../stores/panel.js';

import { usePanelState } from './usePanelStore.js';

/**
 * Search text parsing, the infinite resource query, and the search analytics.
 *
 * The committed text is the single source of truth for filters; the debounce and
 * the explicit form submit both write it back to the store.
 * @param store - panel store.
 * @param recordNav - history recorder provided by {@link useNavHistory}.
 * @returns parsed syntax, filter object, query state, rows, and search callbacks.
 */
export function useResourceSearch(
  store: PanelStore,
  recordNav: (entry: Omit<PanelNavEntry, 'scrollTop'>) => void
) {
  const React = getReact();
  const input = usePanelState(store, (state) => state.input);
  const submitted = usePanelState(store, (state) => state.submitted);
  const composing = usePanelState(store, (state) => state.composing);
  const subjectFilter = usePanelState(store, (state) => state.subjectFilter);
  const typedSearch = React.useRef(false);
  const trackedError = React.useRef('');

  const parsed = React.useMemo(() => parseSearchInput(submitted), [submitted]);
  const filter = React.useMemo(
    () => createResourceFilter(parsed, subjectFilter),
    [parsed, subjectFilter]
  );

  const query = useInfiniteQuery({
    queryKey: ['animegarden', 'resources', filter],
    queryFn: ({ pageParam, signal }) => requestResources(filter, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.complete ? undefined : lastPage.page + 1)
  });
  const resources = query.data?.pages.flatMap((page) => page.resources) ?? [];

  /** Mark the next debounce as user-typed so it reports `search.trigger`. */
  const markTyped = React.useCallback((): void => {
    typedSearch.current = true;
  }, []);

  /** Submit the typed text immediately (the form's Enter handler). */
  const submitSearch = React.useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      if (store.store.state.composing) return;
      const text = store.store.state.input.trim();
      store.commitSearch(text);
      recordNav({ view: 'search', query: text, subjectId: store.store.state.subjectFilter });
      if (text !== '') {
        track('search.trigger', { text, source: 'button' });
      }
      typedSearch.current = false;
    },
    [store, recordNav]
  );

  // Auto-submit after a short debounce; IME composition is not interrupted so
  // Chinese input only searches when the candidate is committed.
  React.useEffect(() => {
    if (composing) return;
    // Navigation and toolbar actions already commit their text. They must not
    // schedule another search that changes the view or truncates forward history.
    if (input.trim() === submitted) {
      typedSearch.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      const text = store.store.state.input.trim();
      if (text === store.store.state.submitted) return;
      store.commitSearch(text);
      recordNav({ view: 'search', query: text, subjectId: store.store.state.subjectFilter });
      // Only searches typed by the user; programmatic filter/subject rewrites do not fire.
      if (typedSearch.current && text !== '') {
        track('search.trigger', { text, source: 'button' });
      }
      typedSearch.current = false;
    }, 350);
    return () => window.clearTimeout(timer);
  }, [input, submitted, composing, store, recordNav]);

  // Report resource fetch failures with the website's analytics event.
  React.useEffect(() => {
    if (!query.isError) return;
    const message = query.error instanceof Error ? query.error.message : String(query.error ?? '');
    if (message === '' || trackedError.current === message) return;
    trackedError.current = message;
    track('error.fetch-resources', { path: '/dsh-plugin/resources', error: message.slice(0, 300) });
  }, [query.isError, query.error]);

  return { parsed, filter, query, resources, submitSearch, markTyped };
}
