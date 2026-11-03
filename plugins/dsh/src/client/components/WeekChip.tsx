import type { CalendarSubject } from '../api/bgm.js';
import type { TranslateFunction } from '../i18n.js';

import { getReact } from '../react.js';
import { WEB_LABEL, WEB_WEEKDAY, WEEKDAY_KEYS, subjectDisplayName } from '../api/bgm.js';

import { LoadingStatus } from './LoadingStatus.js';

/** Props for one rotated weekday chip with its hover list. */
export interface WeekChipProps {
  t: TranslateFunction;
  weekday: number;
  current: boolean;
  active: boolean;
  open: boolean;
  /** The weekday currently previewed by the toolbar (guards stale close timers). */
  hovered: number | null;
  subjects?: CalendarSubject[];
  loading: boolean;
  onHover: (weekday: number | null) => void;
  onSelect: (weekday: number) => void;
  onSelectAnime: (subjectId: number, title: string, weekday: number) => void;
}

/** One rotated weekday chip with its hover list from the calendar buckets. */
export function WeekChip(props: WeekChipProps) {
  const React = getReact();
  const { t } = props;
  const items = (props.subjects ?? []).slice(0, 30);
  const popover = React.useRef<HTMLDivElement | null>(null);
  const [alignEnd, setAlignEnd] = React.useState(false);
  const closeTimer = React.useRef<number | null>(null);
  // Latest previewed weekday, so a leave timer scheduled on one chip cannot close
  // the popover that another chip already opened (the horizontal-slide bug).
  const hovered = React.useRef<number | null>(props.hovered);
  hovered.current = props.hovered;

  /** Cancel a pending hover-close so moving into the popover stays stable. */
  const cancelClose = (): void => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  React.useEffect(() => cancelClose, []);
  const openSoon = (): void => {
    cancelClose();
    props.onHover(props.weekday);
  };
  const closeSoon = (): void => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      // Another chip took over the preview in the meantime: keep it open.
      if (hovered.current !== props.weekday) return;
      props.onHover(null);
    }, 160);
  };

  // Left-aligned by default; flip to the right edge only when the popover would
  // overflow the viewport. Measure before paint so the popover never renders once
  // in the wrong place and then jumps sideways.
  React.useLayoutEffect(() => {
    if (!props.open || popover.current === null) return;
    const rect = popover.current.getBoundingClientRect();
    setAlignEnd(rect.right > window.innerWidth - 8);
  }, [props.open, items.length]);

  return (
    <div className="agp-week" onMouseEnter={openSoon} onMouseLeave={closeSoon}>
      <button
        type="button"
        className="agp-week-chip"
        aria-haspopup="menu"
        aria-expanded={props.open}
        aria-current={props.current ? 'date' : undefined}
        data-active={props.active ? 'true' : undefined}
        onClick={() => {
          cancelClose();
          props.onSelect(props.weekday);
        }}
        onFocus={openSoon}
        onBlur={closeSoon}
      >
        {props.weekday === WEB_WEEKDAY ? WEB_LABEL : t(WEEKDAY_KEYS[props.weekday])}
      </button>
      {props.open ? (
        <div
          className="agp-week-bridge"
          aria-hidden="true"
          onMouseEnter={openSoon}
          onMouseLeave={closeSoon}
        />
      ) : null}
      {props.open ? (
        <div
          className={`agp-week-popover${alignEnd ? ' agp-week-popover-end' : ''}`}
          ref={popover}
          role="menu"
          onMouseEnter={openSoon}
          onMouseLeave={closeSoon}
        >
          <div className="agp-week-scroll" role="menu">
            {props.loading ? (
              <LoadingStatus label={t('loadingCalendar')} />
            ) : items.length === 0 ? (
              <p className="agp-week-empty">{t('emptyCalendar')}</p>
            ) : (
              items.map((subject) => (
                <button
                  key={subject.id}
                  type="button"
                  role="menuitem"
                  className="agp-week-item"
                  onClick={() => {
                    props.onHover(null);
                    props.onSelectAnime(subject.id, subjectDisplayName(subject), props.weekday);
                  }}
                >
                  {subjectDisplayName(subject)}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
