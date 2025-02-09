import clsx from 'clsx';
import { NavLink } from '@remix-run/react';
import { useAtomValue } from 'jotai';
import { memo, useEffect, useState } from 'react';

import { calendar, getSubjectURL } from '~/utils/anime';
import { fansubs as AllFansubs, types, DisplayTypeColor } from '~/utils/constants';
import {
  Dropdown,
  DropdownMenu,
  DropdownSubMenuItem,
  DropdownSubMenu
} from '~/components/Dropdown';
import { DisplayTypeIcon } from '~/components/Icons';
import { preferFansubsAtom } from '~/states';

export const Header = memo((props: { feedURL?: string }) => {
  const { feedURL } = props;

  return (
    <header
      className="fixed z-13 pt-[1px] flex justify-center items-center w-full h-$nav-height pointer-events-none text-base-500"
      suppressHydrationWarning={true}
    >
      <nav className="main flex gap-1 [&>div]:(leading-$nav-height)">
        <div className="box-content w-[32px] pl3 lt-sm:pl1 text-2xl text-center font-quicksand font-bold pointer-events-auto">
          <NavLink to="/">🌸</NavLink>
        </div>
        <AnimeDropdown />
        <FansubsDropdown />
        <TypesDropdown />
        <div className="flex-auto pointer-events-none"></div>
        <div className="lt-md:hidden pointer-events-auto">
          {feedURL && (
            <a
              href={feedURL}
              target="_blank"
              className="inline cursor-pointer rounded-md p-2 text-[#ee802f] [&:hover>span]:(text-[#ff7800]! border-b-2 border-b-[#ff7800]!)"
            >
              <span>
                <span className="i-carbon-rss text-sm mr1" />
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
  return (
    <Dropdown
      className="nav-animes pointer-events-auto [&:hover>a]:bg-zinc-100!"
      trigger={
        <NavLink to="/resources/1?type=动画" className="rounded-md p-2">
          动画
        </NavLink>
      }
    >
      <DropdownMenu className="mt-[-10px] w-[120px] max-h-[600px] lt-sm:max-h-[360px] rounded-md shadow-box divide-y bg-light-100 leading-normal">
        <NavLink
          to="/resources/1?type=动画"
          className="block px2 py1 rounded-t-md hover:bg-basis-100"
        >
          资源列表
        </NavLink>
        {calendar
          .sort((l, r) => l.index - r.index)
          .map((day) => (
            <DropdownSubMenuItem
              key={day.text}
              className="[&:hover>.trigger]:bg-basis-100!"
              trigger={
                <div
                  className={`trigger px2 py1 cursor-pointer ${day.index === 7 && 'rounded-b-md'}`}
                >
                  周{day.text}
                </div>
              }
            >
              <DropdownSubMenu className="pt-[1px] pl-[6px] pb-[2px] pr-[2px]">
                <div className="max-h-[500px] lt-sm:max-h-[360px] divide-y rounded-md shadow-box bg-light-100">
                  {day.bangumis.map((bgm, index) => (
                    <NavLink
                      to={getSubjectURL(bgm)}
                      key={bgm.id}
                      className={clsx(
                        'block w-[360px] px2 py1 hover:bg-basis-100 whitespace-nowrap overflow-hidden text-ellipsis',
                        index === 0 && 'rounded-t-md',
                        index === day.bangumis.length - 1 && 'rounded-b-md'
                      )}
                    >
                      {bgm.bangumi?.name_cn || bgm.name}
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
  const preferFansubs = useAtomValue(preferFansubsAtom);

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
      className="nav-fansubs pointer-events-auto [&:hover>a]:bg-zinc-100!"
      trigger={
        <NavLink to={`/resources/1?fansub=${fansubs[0]}`} className="rounded-md p-2">
          字幕组
        </NavLink>
      }
    >
      <DropdownMenu className="mt-[-10px] w-[160px] max-h-[494px] overflow-y-auto rounded-md shadow-box divide-y bg-light-100 leading-normal">
        {fansubs.map((fansub) => (
          <NavLink
            key={fansub}
            to={`/resources/1?fansub=${fansub}`}
            className="block px2 py1 hover:bg-basis-100 whitespace-nowrap overflow-hidden text-ellipsis"
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
      className="nav-types pointer-events-auto [&:hover>a]:bg-zinc-100!"
      trigger={
        <NavLink to={`/resources/1`} className="rounded-md p-2">
          资源
        </NavLink>
      }
    >
      <DropdownMenu className="mt-[-10px] w-max overflow-y-auto rounded-md shadow-box divide-y bg-light-100 leading-normal">
        {types.map((type) => (
          <NavLink
            key={type}
            to={`/resources/1?type=${type}`}
            className={clsx(
              'flex items-center gap-2 px2 py1 hover:bg-basis-100',
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
