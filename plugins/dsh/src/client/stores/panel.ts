/**
 * Panel UI store shared by the search shell and the toolbar.
 *
 * Server data stays in TanStack Query; this store only holds the interaction
 * state that several components need (search text, view, navigation history,
 * hovered/active weekday and the calendar hand-off flags). Using one store
 * avoids threading a dozen callbacks between the shell and the toolbar.
 */

import { Store } from '@tanstack/store';

import { parseSearchInput } from '../../../../../apps/web/src/layouts/Search/parse';

import type { CalendarScrollRequest } from '../components/CalendarView.js';

/** The two content views the panel switches between without leaving the slot. */
export type PanelView = 'search' | 'calendar';

/** One in-panel navigation snapshot for the back/forward controls. */
export interface PanelNavEntry {
  view: PanelView;
  query: string;
  subjectId: number | null;
  scrollTop: number;
}

/** Interaction state owned by the panel store. */
export interface PanelState {
  input: string;
  submitted: string;
  composing: boolean;
  view: PanelView;
  hoveredWeekday: number | null;
  scrollRequest: CalendarScrollRequest | null;
  calendarPending: boolean;
  subjectFilter: number | null;
  activeWeekday: number | null;
  /** Scroll offset to restore after a back/forward navigation renders. */
  pendingScroll: number | null;
  nav: {
    entries: PanelNavEntry[];
    index: number;
  };
}

/** Maximum number of retained navigation snapshots (browser-like history). */
const MAX_HISTORY = 50;

/** Build the initial state: one empty search entry, search view. */
function initialState(): PanelState {
  return {
    input: '',
    submitted: '',
    composing: false,
    view: 'search',
    hoveredWeekday: null,
    scrollRequest: null,
    calendarPending: false,
    subjectFilter: null,
    activeWeekday: null,
    pendingScroll: null,
    nav: { entries: [{ view: 'search', query: '', subjectId: null, scrollTop: 0 }], index: 0 }
  };
}

/**
 * Create the panel store once per mounted panel.
 * @returns the store plus the actions that mutate related fields together.
 */
export function createPanelStore() {
  const store = new Store<PanelState>(initialState());

  /** Shallow-merge a patch into the store. */
  const update = (patch: Partial<PanelState>): void => {
    store.setState((state) => ({ ...state, ...patch }));
  };

  return {
    store,

    setInput(input: string): void {
      update({ input });
    },
    setComposing(composing: boolean): void {
      update({ composing });
    },
    setView(view: PanelView): void {
      update({ view });
    },
    setHoveredWeekday(hoveredWeekday: number | null): void {
      update({ hoveredWeekday });
    },
    setScrollRequest(scrollRequest: CalendarScrollRequest | null): void {
      update({ scrollRequest });
    },
    setCalendarPending(calendarPending: boolean): void {
      update({ calendarPending });
    },
    setActiveWeekday(activeWeekday: number | null): void {
      update({ activeWeekday });
    },
    setPendingScroll(pendingScroll: number | null): void {
      update({ pendingScroll });
    },

    /**
     * Commit text and its calendar binding together. A supplied id selects a new
     * subject; otherwise preserve the binding only while its subject tokens match.
     */
    commitSearch(query: string, subjectId?: number | null): void {
      const state = store.state;
      const previous = parseSearchInput(state.submitted).subjects;
      const next = parseSearchInput(query).subjects;
      const sameSubjects =
        previous.length === next.length && previous.every((value, index) => value === next[index]);
      update({
        input: query,
        submitted: query,
        subjectFilter:
          subjectId !== undefined ? subjectId : sameSubjects ? state.subjectFilter : null,
        view: 'search',
        scrollRequest: null,
        calendarPending: false
      });
    },

    /** Navigate back to the search view without changing the query. */
    openSearchView(): void {
      update({ view: 'search', scrollRequest: null, calendarPending: false });
    },

    /** Show the calendar view and remember that it is no longer pending. */
    openCalendarView(): void {
      update({ view: 'calendar', calendarPending: false });
    },

    /**
     * Record one navigation snapshot, dropping duplicates and old entries.
     * @param entry - target view/query/subject.
     * @param scrollTop - current scroll offset of the results container.
     */
    recordNav(entry: Omit<PanelNavEntry, 'scrollTop'>, scrollTop: number): void {
      store.setState((state) => {
        const current = state.nav.entries[state.nav.index];
        if (
          current !== undefined &&
          current.view === entry.view &&
          current.query === entry.query &&
          current.subjectId === entry.subjectId
        ) {
          return state;
        }
        const next = [...state.nav.entries.slice(0, state.nav.index + 1), { ...entry, scrollTop }];
        const entries = next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
        return { ...state, nav: { entries, index: entries.length - 1 } };
      });
    },

    /** Move the history cursor without recording a new entry. */
    setNavIndex(index: number): void {
      store.setState((state) => ({ ...state, nav: { ...state.nav, index } }));
    }
  };
}

/** The panel store plus its actions. */
export type PanelStore = ReturnType<typeof createPanelStore>;
