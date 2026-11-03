import { fansubs } from '../../../../../apps/web/src/utils/constants';

import { RESOURCE_TYPES } from '../../shared/resource';

import type { CalendarSubject } from '../api/bgm.js';
import type { TranslateFunction } from '../i18n.js';

import { getReact } from '../react.js';

import { FilterDropdown } from './FilterDropdown.js';
import { ChevronLeftIcon, ChevronRightIcon, RefreshIcon } from './icons.js';
import { WeekChip } from './WeekChip.js';
import { LoaderIcon } from './LoadingStatus.js';

/** Props for the toolbar below the search box. */
export interface ToolbarProps {
  t: TranslateFunction;
  view: 'search' | 'calendar';
  onToggleCalendar: () => void;
  /** Weekday indexes in rotated display order (Monday = 0). */
  weekdays: number[];
  /** Seven weekday buckets backing the hover lists. */
  calendarSubjects?: CalendarSubject[][];
  calendarLoading: boolean;
  calendarPending: boolean;
  /** Weekday section currently following the calendar scroll (null outside it). */
  activeWeekday: number | null;
  hoveredWeekday: number | null;
  onHoverWeekday: (weekday: number | null) => void;
  onSelectWeekday: (weekday: number) => void;
  onSelectAnime: (subjectId: number, title: string, weekday: number) => void;
  selectedTypes: string[];
  onChangeTypes: (values: string[]) => void;
  selectedFansubs: string[];
  onChangeFansubs: (values: string[]) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

/**
 * Render the toolbar: calendar + rotated weekday chips, a divider, then the
 * fan-sub and type multi-selects.
 * @param props - view state, calendar buckets, selections, and callbacks.
 * @returns the toolbar element tree.
 */
export function Toolbar(props: ToolbarProps) {
  const React = getReact();
  const { t } = props;
  const typeOptions = RESOURCE_TYPES.map((entry) => ({
    key: entry.value,
    label: t(`type.${entry.key}`)
  }));
  const fansubOptions = fansubs.map((name) => ({ key: name, label: name }));

  return (
    <div className="agp-toolbar">
      <div className="agp-toolbar-group" role="group" aria-label={t('calendar')}>
        <button
          type="button"
          className="agp-toolbar-button"
          aria-pressed={props.view === 'calendar'}
          aria-busy={props.calendarPending}
          title={props.calendarPending ? t('loadingCalendar') : undefined}
          onClick={props.onToggleCalendar}
        >
          {props.view === 'calendar' ? t('switchToSearch') : t('calendar')}
        </button>
        {props.weekdays.map((weekday, position) => (
          <WeekChip
            key={weekday}
            t={t}
            weekday={weekday}
            current={position === 0}
            active={props.view === 'calendar' && props.activeWeekday === weekday}
            open={props.hoveredWeekday === weekday}
            hovered={props.hoveredWeekday}
            subjects={props.calendarSubjects?.[weekday]}
            loading={props.calendarLoading && props.calendarSubjects === undefined}
            onHover={props.onHoverWeekday}
            onSelect={props.onSelectWeekday}
            onSelectAnime={props.onSelectAnime}
          />
        ))}
      </div>
      <span className="agp-toolbar-divider" aria-hidden="true" />
      <div className="agp-toolbar-group" role="group" aria-label={t('filtersLabel')}>
        <FilterDropdown
          t={t}
          label={t('fansubFilter')}
          options={fansubOptions}
          selected={props.selectedFansubs}
          onChange={props.onChangeFansubs}
        />
        <FilterDropdown
          t={t}
          label={t('typeFilter')}
          options={typeOptions}
          selected={props.selectedTypes}
          onChange={props.onChangeTypes}
        />
      </div>
      <div className="agp-toolbar-group agp-toolbar-nav" role="group" aria-label={t('history')}>
        <button
          type="button"
          className="agp-toolbar-button agp-nav-button"
          disabled={!props.canGoBack}
          aria-label={t('navBack')}
          title={t('navBack')}
          onClick={props.onBack}
        >
          <ChevronLeftIcon />
        </button>
        <button
          type="button"
          className="agp-toolbar-button agp-nav-button"
          disabled={!props.canGoForward}
          aria-label={t('navForward')}
          title={t('navForward')}
          onClick={props.onForward}
        >
          <ChevronRightIcon />
        </button>
        <button
          type="button"
          className="agp-toolbar-button agp-nav-button"
          aria-label={t('refresh')}
          aria-busy={props.refreshing}
          title={t('refresh')}
          disabled={props.refreshing}
          onClick={props.onRefresh}
        >
          {props.refreshing ? <LoaderIcon size={14} /> : <RefreshIcon />}
        </button>
      </div>
    </div>
  );
}
