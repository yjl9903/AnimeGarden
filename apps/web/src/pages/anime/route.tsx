import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { Calendar } from 'bgmx/client';
import { ChevronDown } from 'lucide-react';

import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu';
import Layout from '~/layouts/Layout';
import { trackAnimeCalendarClick } from '~/utils';
import { getCalendar } from '~/utils/calendar';
import { CalendarSeasonMonths, getCalendarSeason } from '~/utils/calendar-season';
import { getSubjectDisplayName, getSubjectRouteLink, type WebBgmSubject } from '~/utils/subject';

import './anime.css';

/**
 * Renders the anime calendar as a season header plus weekday sections.
 */
export default function Index({
  timestamp,
  calendar,
  calendars,
  season,
  onSeasonChange
}: {
  timestamp?: Date;
  calendar: WebBgmSubject[][];
  calendars: Calendar[];
  season?: string;
  onSeasonChange: (season: string) => void;
}) {
  const resolvedCalendar = getCalendar(calendar);
  const [activeWeekday, setActiveWeekday] = useState(resolvedCalendar[0]?.index ?? 1);
  const selectedSeasonId = season ?? calendars[0]?.season ?? '';
  const selectedSeason = getCalendarSeason(selectedSeasonId);
  const years = [...new Set(calendars.map((calendar) => calendar.season.split('-')[0]))];
  const seasonOptions = calendars
    .filter((calendar) => calendar.season.startsWith(`${selectedSeason.year}-`))
    .map((calendar) => getCalendarSeason(calendar.season))
    .sort(
      (left, right) =>
        CalendarSeasonMonths.indexOf(left.month) - CalendarSeasonMonths.indexOf(right.month)
    );

  const updateSeason = (year: string, month: number) => {
    const candidates = calendars
      .map((calendar) => getCalendarSeason(calendar.season))
      .filter((calendar) => calendar.year === year)
      .sort(
        (left, right) =>
          CalendarSeasonMonths.indexOf(left.month) - CalendarSeasonMonths.indexOf(right.month)
      );
    const nextSeason =
      candidates.find((calendar) => calendar.month === month)?.season ??
      [...candidates].reverse().find((calendar) => calendar.month <= month)?.season ??
      candidates[0]?.season;

    if (nextSeason) onSeasonChange(nextSeason);
  };

  useEffect(() => {
    if (import.meta.env.SSR) return;

    let frame = 0;

    const updateActiveWeekday = () => {
      if (frame) return;

      frame = requestAnimationFrame(() => {
        frame = 0;
        const anchorY = Math.min(window.innerHeight * 0.35, 180);
        let nextActive = resolvedCalendar[0]?.index ?? 1;

        for (const cal of resolvedCalendar) {
          const section = document.getElementById(`星期${cal.text}`);
          if (!section) continue;
          if (section.getBoundingClientRect().top <= anchorY) {
            nextActive = cal.index;
          }
        }

        setActiveWeekday((prev) => (prev === nextActive ? prev : nextActive));
      });
    };

    updateActiveWeekday();
    window.addEventListener('scroll', updateActiveWeekday, { passive: true });
    window.addEventListener('resize', updateActiveWeekday);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateActiveWeekday);
      window.removeEventListener('resize', updateActiveWeekday);
    };
  }, [calendar]);

  return (
    <Layout timestamp={timestamp}>
      <div className="anime-page w-full pt-13 pb-24">
        <header className="mb-12 flex items-end justify-between gap-4 lt-sm:flex-col lt-sm:items-start">
          <div>
            <h1 className="text-3xl lt-sm:text-2xl font-bold leading-tight tracking-normal select-none">
              <span
                className="anime-season-emoji text-2xl font-quicksand font-bold"
                aria-hidden="true"
              >
                {selectedSeason.emoji}
              </span>
              {selectedSeason.title}
            </h1>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-[112px] justify-between rounded-md px-3 text-base font-bold"
                  disabled={calendars.length === 0}
                >
                  {selectedSeason.year} 年
                  <ChevronDown className="ml-2 h-4 w-4 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                style={{
                  width: 'var(--radix-dropdown-menu-trigger-width)',
                  minWidth: 'var(--radix-dropdown-menu-trigger-width)'
                }}
              >
                <DropdownMenuRadioGroup
                  value={selectedSeason.year}
                  onValueChange={(nextYear) => updateSeason(nextYear, selectedSeason.month)}
                >
                  {years.map((year) => (
                    <DropdownMenuRadioItem
                      key={year}
                      value={year}
                      className="anime-season-menu-item"
                    >
                      {year} 年
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-[112px] justify-between rounded-md px-3 text-base font-bold"
                  disabled={calendars.length === 0}
                >
                  <span>
                    <span className="mr-1.5">{selectedSeason.emoji}</span>
                    {selectedSeason.label}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                style={{
                  width: 'var(--radix-dropdown-menu-trigger-width)',
                  minWidth: 'var(--radix-dropdown-menu-trigger-width)'
                }}
              >
                <DropdownMenuRadioGroup
                  value={String(selectedSeason.month)}
                  onValueChange={(nextMonth) =>
                    updateSeason(selectedSeason.year, Number(nextMonth))
                  }
                >
                  {seasonOptions.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.month}
                      value={String(option.month)}
                      className="anime-season-menu-item"
                    >
                      <span className="mr-1.5">{option.emoji}</span>
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="anime-layout">
          <nav className="anime-toc" aria-label="星期目录">
            {resolvedCalendar.map((cal) => (
              <a
                className={activeWeekday === cal.index ? 'is-active' : undefined}
                href={`#星期${cal.text}`}
                key={cal.index}
                onClick={() => setActiveWeekday(cal.index)}
              >
                星期{cal.text}
              </a>
            ))}
          </nav>

          <div className="anime-days space-y-14">
            {resolvedCalendar.map((cal) => (
              <section className="bgm-weekday" id={`星期${cal.text}`} key={cal.index}>
                <h2 className="mb-6 select-none">
                  <a
                    className="text-2xl lt-sm:text-xl font-bold leading-tight"
                    href={`#星期${cal.text}`}
                  >
                    星期{cal.text}
                  </a>
                </h2>
                <div className="anime-bgm-grid">
                  {cal.bangumis.map((bgm) => (
                    <Link
                      {...getSubjectRouteLink(bgm)}
                      className="anime-card group"
                      key={bgm.id}
                      onClick={() =>
                        trackAnimeCalendarClick({
                          subjectId: String(bgm.id),
                          title: getSubjectDisplayName(bgm),
                          weekday: `星期${cal.text}`
                        })
                      }
                    >
                      <div className="anime-poster select-none">
                        <img src={bgm.poster} alt={`${getSubjectDisplayName(bgm)} poster`} />
                      </div>
                      <div className="anime-title">
                        <span>{getSubjectDisplayName(bgm)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
