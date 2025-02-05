import clsx from 'clsx';
import { memo } from 'react';
import { NavLink } from '@remix-run/react';
import { useAtomValue } from 'jotai';

import { calendar, getSubjectURL } from '~/utils/anime';
import {
  Dropdown,
  DropdownMenu,
  DropdownSubMenuItem,
  DropdownSubMenu
} from '~/components/Dropdown';

import Search from './Search';
import { Footer } from './Footer';
import { Loading } from './Loading';
import { isOpenSidebar, Sidebar } from './Sidebar';

export const NavHeight = 66;

export const SearchTop = 128;

export const HeroHeight = 300;

export interface LayoutProps {
  children?: React.ReactNode;
  timestamp?: string;
  feedURL?: string;
}

export default function Layout(props: LayoutProps) {
  const { timestamp, feedURL } = props;
  const isOpen = useAtomValue(isOpenSidebar);

  return (
    <>
      <Hero feedURL={feedURL}></Hero>
      <div className={clsx('w-full flex', isOpen ? 'main-with-sidebar' : 'main-without-sidebar')}>
        <Sidebar></Sidebar>
        <div className="flex-auto flex items-center justify-center min-h-[calc(100vh-316px-196px)]">
          <main className="main">{props.children}</main>
        </div>
      </div>
      <Footer timestamp={timestamp} feedURL={feedURL}></Footer>
      <Loading></Loading>
    </>
  );
}

const Hero = memo((props: { feedURL?: string }) => {
  return (
    <>
      <search
        id="hero-search"
        className="w-full h-$nav-height z-12 flex items-center justify-center pointer-events-none"
        suppressHydrationWarning={true}
      >
        <div className="vercel relative h-[44.4px] md:w-[600px] lt-md:w-[95vw] max-w-full pointer-events-auto">
          <Search></Search>
        </div>
      </search>
      <Header feedURL={props.feedURL}></Header>
      <div
        id="hero-banner"
        className="w-full h-$hero-height bg-[#fef8f7]"
        suppressHydrationWarning={true}
      >
        <div className="lg:z-12 lt-lg:z-10 w-full pt-5rem pb-3rem text-4xl font-quicksand font-bold text-center select-none outline-none pointer-events-none">
          <NavLink to="/" className="pointer-events-auto cursor-pointer">
            <span>🌸 Anime Garden</span>
          </NavLink>
        </div>
      </div>
      <div
        id="hero-placeholder"
        className="w-full h-$nav-height hidden z-1"
        suppressHydrationWarning={true}
      ></div>
    </>
  );
});

const Header = memo((props: { feedURL?: string }) => {
  const { feedURL } = props;

  return (
    <header
      className="fixed z-13 pt-[1px] flex justify-center items-center w-full h-$nav-height text-base-500"
      suppressHydrationWarning={true}
    >
      <nav className="main flex gap-1 [&>div]:(leading-$nav-height)">
        <div className="box-content w-[32px] pl3 lt-sm:pl1 text-2xl text-center font-quicksand font-bold">
          <NavLink to="/">🌸</NavLink>
        </div>
        <Dropdown
          className="nav-anime [&:hover>a]:bg-zinc-100!"
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
        <div className="nav-fansub">
          <NavLink to="/resources/1" className="rounded-md p-2 hover:(bg-zinc-100)">
            字幕组
          </NavLink>
        </div>
        <div className="nav-resources">
          <NavLink to="/resources/1" className="rounded-md p-2 hover:(bg-zinc-100)">
            资源
          </NavLink>
        </div>
        <div className="flex-auto"></div>
        <div>
          {feedURL && (
            <a
              href={feedURL}
              target="_blank"
              className="inline cursor-pointer rounded-md p-2 text-[#ee802f] hover:(!text-[#ff7800] !border-b-[#ff7800] bg-zinc-100)"
            >
              <span className="i-carbon-rss mr1" />
              <span>RSS</span>
            </a>
          )}
        </div>
      </nav>
    </header>
  );
});
