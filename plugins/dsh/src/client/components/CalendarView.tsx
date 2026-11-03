import type { ReactNode } from 'react';

import { getCalendarSeason } from '../../../../../apps/web/src/utils/calendar-season';

import type { CalendarSubject } from '../api/bgm.js';
import type { TranslateFunction } from '../i18n.js';

import {
  WEB_LABEL,
  WEB_WEEKDAY,
  WEEKDAY_KEYS,
  currentWeekdayIndex,
  rotatedWeekdays,
  subjectDisplayName,
  subjectPosterURL
} from '../api/bgm.js';

import { getReact } from '../react.js';

/** A request to scroll the calendar view to one weekday section. */
export interface CalendarScrollRequest {
  weekday: number;
  nonce: number;
}

/** Props for the calendar view (pure presentation over already-fetched data). */
export interface CalendarViewProps {
  t: TranslateFunction;
  season?: string;
  subjects?: CalendarSubject[][];
  /** Upstream WEB bucket (index-free) shown after the seven weekdays. */
  web?: CalendarSubject[];
  scrollRequest: CalendarScrollRequest | null;
  onSelectSubject: (subjectId: number, title: string, weekday: number) => void;
}

/**
 * Render the weekly calendar: seven weekday sections in the rotated broadcast
 * order, each with poster cards linking to the public subject page.
 * @param props - season, fetched buckets, request state, and navigation callbacks.
 * @returns the calendar view element tree.
 */
export function CalendarView(props: CalendarViewProps) {
  // Classic JSX emits React.createElement, so the loader-provided runtime must be in scope.
  const React = getReact();
  const { t } = props;

  const weekdays = React.useMemo(() => rotatedWeekdays(currentWeekdayIndex()), []);

  // Chips request a section; scroll once the matching data is available.
  React.useEffect(() => {
    if (props.scrollRequest === null || props.subjects === undefined) return;
    const node = document.getElementById(`agp-weekday-${props.scrollRequest.weekday}`);
    if (node !== null) node.scrollIntoView({ block: 'start' });
  }, [props.scrollRequest, props.subjects]);

  const sections = weekdays.map((weekday) => ({
    weekday,
    subjects: (props.subjects?.[weekday] ?? []).filter(
      (subject) => subjectPosterURL(subject) !== ''
    )
  }));
  // The website appends the upstream WEB bucket after the seven weekdays.
  if (props.web !== undefined) {
    sections.push({
      weekday: WEB_WEEKDAY,
      subjects: props.web.filter((subject) => subjectPosterURL(subject) !== '')
    });
  }
  const empty = sections.every((section) => section.subjects.length === 0);

  let content: ReactNode;
  if (empty) {
    content = <p className="agp-status">{t('emptyCalendar')}</p>;
  } else {
    content = sections.map((section) => (
      <section
        className="agp-calendar-section"
        id={`agp-weekday-${section.weekday}`}
        key={section.weekday}
      >
        <h3 className="agp-calendar-weekday">
          {section.weekday === WEB_WEEKDAY ? WEB_LABEL : t(WEEKDAY_KEYS[section.weekday])}
        </h3>
        <div className="agp-calendar-grid">
          {section.subjects.map((subject) => (
            <button
              type="button"
              className="agp-calendar-card"
              key={subject.id}
              onClick={() =>
                props.onSelectSubject(subject.id, subjectDisplayName(subject), section.weekday)
              }
            >
              <img
                className="agp-calendar-poster"
                src={subjectPosterURL(subject)}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <span className="agp-calendar-card-title">{subjectDisplayName(subject)}</span>
            </button>
          ))}
        </div>
      </section>
    ));
  }

  const season = getCalendarSeason(props.season);

  return (
    <div className="agp-calendar">
      <header className="agp-calendar-head">
        <h2 className="agp-calendar-title">
          <span className="agp-calendar-season-emoji" aria-hidden="true">
            {season.emoji}
          </span>
          <span>{season.title}</span>
        </h2>
      </header>
      {content}
    </div>
  );
}
