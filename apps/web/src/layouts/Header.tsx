import clsx from 'clsx';
import { Link as NavLink } from '@tanstack/react-router';
import { useSelector } from '@tanstack/react-store';
import { memo, useEffect, useMemo, useState } from 'react';

import { useAppStores } from '~/stores/hooks';
import { getCalendar } from '~/utils/calendar';
import { getSubjectURL } from '~/utils/subjects';
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
          <NavLink to="/" onClick={() => trackNavClick('home', { item: 'home' })}>
            🌸
          </NavLink>
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
  const calendar = useMemo(() => getCalendar(), []);

  return (
    <Dropdown
      className="nav-animes pointer-events-auto [&:hover>a]:bg-zinc-100! dark:[&:hover>a]:bg-zinc-800!"
      data-nav-collision-target="anime"
      trigger={
        <NavLink to="/anime" className="rounded-md p-2" onClick={() => trackNavClick('anime')}>
          动画
        </NavLink>
      }
    >
      <DropdownMenu className="mt-[-10px] w-[80px] max-h-[600px] lt-sm:max-h-[360px] rounded-md shadow-box divide-y bg-light-100 dark:bg-dark-100 leading-normal">
        <NavLink
          to="/anime"
          className="block px2 py1 rounded-t-md hover:bg-basis-100 dark:hover:bg-basis-800"
          onClick={() => trackNavClick('anime')}
        >
          周历
        </NavLink>
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
                    <NavLink
                      to={getSubjectURL(bgm)}
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
                    </NavLink>
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
        <NavLink
          to={`/resources/1?fansub=${fansubs[0]}` as any}
          className="rounded-md p-2"
          onClick={() => trackNavClick('fansub')}
        >
          字幕组
        </NavLink>
      }
    >
      <DropdownMenu className="mt-[-10px] w-[160px] max-h-[494px] overflow-y-auto rounded-md shadow-box divide-y bg-light-100 dark:bg-dark-100 leading-normal">
        {fansubs.map((fansub) => (
          <NavLink
            key={fansub}
            to={`/resources/1?fansub=${fansub}` as any}
            onClick={() => trackNavClick('fansub', { item: fansub })}
            className="block px2 py1 hover:bg-basis-100 dark:hover:bg-basis-800 whitespace-nowrap overflow-hidden text-ellipsis"
          >
            {fansub}
          </NavLink>
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
        <NavLink
          to={'/resources/1' as any}
          className="rounded-md p-2"
          onClick={() => trackNavClick('type')}
        >
          资源
        </NavLink>
      }
    >
      <DropdownMenu className="mt-[-10px] w-max overflow-y-auto rounded-md shadow-box divide-y bg-light-100 dark:bg-dark-100 leading-normal">
        {types.map((type) => (
          <NavLink
            key={type}
            to={
              (type === '动画'
                ? `/resources/1?type=动画&preset=bangumi`
                : `/resources/1?type=${type}`) as any
            }
            onClick={() => trackNavClick('type', { item: type })}
            className={clsx(
              'flex items-center gap-2 px2 py1 hover:bg-basis-100 dark:hover:bg-basis-800',
              DisplayTypeColor[type]
            )}
          >
            {DisplayTypeIcon[type]?.({})}
            <span>{type}</span>
          </NavLink>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
});
