import clsx from 'clsx';
import { Link } from '@tanstack/react-router';
import { useSelector } from '@tanstack/react-store';
import { useSuspenseQuery } from '@tanstack/react-query';
import { memo, useEffect, useMemo, useState } from 'react';

import { useAppStores } from '~/stores/hooks';
import { calendarQueryOptions } from '~/query';
import { getCalendar } from '~/utils/calendar';
import { getSubjectRouteLink } from '~/utils/subject';
import { getResourcesRouteLink } from '~/utils/routes';
import { getOpenFeedTrackEvent, trackNavClick } from '~/utils/umami';
import { fansubs as AllFansubs, types, DisplayTypeColor } from '~/utils/constants';
import {
  Dropdown,
  DropdownMenu,
  DropdownSubMenuItem,
  DropdownSubMenu
} from '~/components/Dropdown';
import { DisplayTypeIcon } from '~/components/Icons';

export const Header = memo((props: { feedURL?: string }) => {
  const { feedURL } = props;

  return (
    <header
      className="fixed z-13 pt-[1px] flex justify-center items-center w-[calc(100%-var(--removed-body-scroll-bar-size,0px))] h-$nav-height pointer-events-none text-base-500"
      suppressHydrationWarning={true}
    >
      <nav className="main flex gap-1 [&>div]:(leading-$nav-height)">
        <div className="box-content w-[32px] pl3 lt-sm:pl1 text-2xl text-center font-quicksand font-bold pointer-events-auto">
          <Link to="/" onClick={() => trackNavClick('home', { item: 'home' })}>
            🌸
          </Link>
        </div>
        <AnimeDropdown />
        <FansubsDropdown />
        <TypesDropdown />
        <div className="flex-auto pointer-events-none"></div>
        <div className="lt-md:hidden pointer-events-auto">
          {feedURL && (
            <a
              href={feedURL}
              {...getOpenFeedTrackEvent(feedURL)}
              className="inline cursor-pointer rounded-md p-2 text-[#ee802f] [&:hover>span]:(text-[#ff7800]! border-b-2 border-b-[#ff7800]!)"
              target="_blank"
            >
              <span>
                <span className="i-mdi-rss text-sm mr1 relative top-[2px]" />
                <span>RSS</span>
              </span>
            </a>
          )}
        </div>
        <div className="hidden lt-md:block"></div>
      </nav>
    </header>
  );
});

const AnimeDropdown = memo(() => {
  const { data } = useSuspenseQuery(calendarQueryOptions());
  const calendar = useMemo(() => getCalendar(data.calendar), [data.calendar]);

  return (
    <Dropdown
      className="nav-animes pointer-events-auto [&:hover>a]:bg-zinc-100! dark:[&:hover>a]:bg-zinc-800!"
      data-nav-collision-target="anime"
      trigger={
        <Link to="/anime" className="rounded-md p-2" onClick={() => trackNavClick('anime')}>
          动画
        </Link>
      }
    >
      <DropdownMenu className="mt-[-10px] w-[80px] max-h-[600px] lt-sm:max-h-[360px] rounded-md shadow-box divide-y bg-light-100 dark:bg-dark-100 leading-normal">
        <Link
          to="/anime"
          className="block px2 py1 rounded-t-md hover:bg-basis-100 dark:hover:bg-basis-800"
          onClick={() => trackNavClick('anime')}
        >
          周历
        </Link>
        {calendar
          .sort((l, r) => l.index - r.index)
          .map((day, index) => (
            <DropdownSubMenuItem
              key={day.text}
              className="[&:hover>.trigger]:bg-basis-100! dark:[&:hover>.trigger]:bg-basis-800!"
              trigger={
                <div
                  className={`trigger px2 py1 cursor-pointer ${day.index === 7 && 'rounded-b-md'}`}
                >
                  周{day.text}
                </div>
              }
            >
              <DropdownSubMenu className="pt-[1px] pl-[6px] pb-[2px] pr-[2px]">
                <div
                  className={`min-h-[100px] max-h-[min(500px,calc(100vh-120px-var(--offset)))] lt-sm:max-h-[360px] rounded-md shadow-box bg-light-100 dark:bg-dark-100 divide-y overflow-y-auto overscroll-none`}
                  style={{ '--offset': `${index * 33}px` }}
                >
                  {day.bangumis.map((bgm, index) => (
                    <Link
                      {...getSubjectRouteLink(bgm)}
                      key={bgm.id}
                      onClick={() =>
                        trackNavClick('anime', {
                          item: bgm.title,
                          group: `周${day.text}`
                        })
                      }
                      className={clsx(
                        'block w-[360px] max-w-[calc(100vw-144px)] px2 py1 hover:bg-basis-100 dark:hover:bg-basis-800 whitespace-nowrap overflow-hidden text-ellipsis',
                        index === 0 && 'rounded-t-md',
                        index === day.bangumis.length - 1 && 'rounded-b-md'
                      )}
                    >
                      {bgm.title}
                    </Link>
                  ))}
                </div>
              </DropdownSubMenu>
            </DropdownSubMenuItem>
          ))}
      </DropdownMenu>
    </Dropdown>
  );
});

const FansubsDropdown = memo(() => {
  const [fansubs, setFansubs] = useState(AllFansubs);
  const { preferFansubsStore } = useAppStores();
  const preferFansubs = useSelector(preferFansubsStore);

  // Reorder fansubs
  useEffect(() => {
    const set = new Set<string>();
    const newFansubs: string[] = [];
    for (const f of preferFansubs) {
      newFansubs.push(f);
      set.add(f);
    }
    for (const f of AllFansubs) {
      if (!set.has(f)) {
        newFansubs.push(f);
      }
    }
    setFansubs(newFansubs);
  }, [preferFansubs]);

  return (
    <Dropdown
      className="nav-fansubs pointer-events-auto [&:hover>a]:bg-zinc-100! dark:[&:hover>a]:bg-zinc-800!"
      data-nav-collision-target="fansubs"
      trigger={
        <Link
          {...getResourcesRouteLink(1, { fansub: fansubs[0] })}
          className="rounded-md p-2"
          onClick={() => trackNavClick('fansub')}
        >
          字幕组
        </Link>
      }
    >
      <DropdownMenu className="mt-[-10px] w-[160px] max-h-[494px] overflow-y-auto rounded-md shadow-box divide-y bg-light-100 dark:bg-dark-100 leading-normal">
        {fansubs.map((fansub) => (
          <Link
            key={fansub}
            {...getResourcesRouteLink(1, { fansub })}
            onClick={() => trackNavClick('fansub', { item: fansub })}
            className="block px2 py1 hover:bg-basis-100 dark:hover:bg-basis-800 whitespace-nowrap overflow-hidden text-ellipsis"
          >
            {fansub}
          </Link>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
});

const TypesDropdown = memo(() => {
  return (
    <Dropdown
      className="nav-types pointer-events-auto [&:hover>a]:bg-zinc-100! dark:[&:hover>a]:bg-zinc-800!"
      data-nav-collision-target="types"
      trigger={
        <Link
          {...getResourcesRouteLink(1)}
          className="rounded-md p-2"
          onClick={() => trackNavClick('type')}
        >
          资源
        </Link>
      }
    >
      <DropdownMenu className="mt-[-10px] w-max overflow-y-auto rounded-md shadow-box divide-y bg-light-100 dark:bg-dark-100 leading-normal">
        {types.map((type) => (
          <Link
            key={type}
            {...getResourcesRouteLink(
              1,
              type === '动画' ? { type: '动画', preset: 'bangumi' } : { type }
            )}
            onClick={() => trackNavClick('type', { item: type })}
            className={clsx(
              'flex items-center gap-2 px2 py1 hover:bg-basis-100 dark:hover:bg-basis-800',
              DisplayTypeColor[type]
            )}
          >
            {DisplayTypeIcon[type]?.({})}
            <span>{type}</span>
          </Link>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
});
