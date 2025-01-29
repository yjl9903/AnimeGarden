import clsx from 'clsx';
import { memo } from 'react';
import { NavLink } from '@remix-run/react';
import { useAtomValue } from 'jotai';

import Search from './Search';
import { Loading } from './Loading';
import { Footer } from './Footer';
import { isOpenSidebar, Sidebar } from './Sidebar';

export const NavHeight = 68;
export const MaxPaddingTop = 152;
export const MaxPaddingBottom = 96;
export const SearchHeight = NavHeight;

export interface LayoutProps {
  children?: React.ReactNode;
  timestamp?: string;
  feedURL?: string;
}

export default function Layout(props: LayoutProps) {
  const { timestamp, feedURL } = props;
  const isOpen = useAtomValue(isOpenSidebar);

  return (
    <div
      className="w-full"
      style={{ '--nav-height': `${NavHeight - 2}px`, '--search-height': `${SearchHeight}px` }}
    >
      <Hero feedURL={feedURL}></Hero>
      <div
        className="flex"
        style={{ paddingTop: `${MaxPaddingTop + NavHeight + MaxPaddingBottom}px` }}
      ></div>
      <div className={clsx('w-full flex', isOpen && 'main-with-sidebar')}>
        <Sidebar></Sidebar>
        <div className="flex-auto flex items-center justify-center min-h-[calc(100vh-316px-196px)]">
          <main className="main">{props.children}</main>
        </div>
      </div>
      <Footer timestamp={timestamp}></Footer>
      <Loading></Loading>
    </div>
  );
}

const Hero = memo((props: { feedURL?: string }) => {
  return (
    <div className="w-full">
      <div
        className="hero z-1 w-full fixed bg-[#fef8f7] border-b border-b-gray-200"
        // style={{ height: `${height}px` }}
      ></div>
      <Header feedURL={props.feedURL}></Header>
      <div
        className="hero-top lg:z-12 lt-lg:z-10 fixed w-full pt-5rem pb-3rem text-4xl font-quicksand font-bold text-center select-none outline-none pointer-events-none"
        suppressHydrationWarning={true}
      >
        <NavLink to="/" className="pointer-events-auto cursor-pointer">
          <span>🌸 Anime Garden</span>
        </NavLink>
      </div>
      <div
        className="hero-search w-full flex justify-center items-center fixed lg:z-12 lt-lg:z-10 pointer-events-none"
        suppressHydrationWarning={true}
        style={{
          height: `${NavHeight}px`,
          paddingTop: '8px',
          paddingBottom: '8px'
        }}
      >
        <div className="main flex justify-center lg:px-[220px]">
          <div className="vercel relative h-[44.4px] xl:w-[800px] md:w-[600px] lt-md:w-[95vw] max-w-full pointer-events-auto">
            <Search></Search>
          </div>
        </div>
      </div>
      <div className="hero-bottom z-10 fixed w-full" suppressHydrationWarning={true}></div>
    </div>
  );
});

const Header = memo((props: { feedURL?: string }) => {
  const { feedURL } = props;

  return (
    <header className="z-11 bg-[#fef8f7] fixed pt-[1px] flex justify-center items-center w-full h-$nav-height text-base-500">
      <nav className="main flex gap-1 [&>div]:leading-$nav-height">
        <div className="box-content w-[32px] pl3 lt-sm:pl1 text-2xl text-center font-quicksand font-bold">
          <NavLink to="/">🌸</NavLink>
        </div>
        <div>
          <NavLink to="/" className="rounded-md p-2 hover:(bg-zinc-100)">
            动画
          </NavLink>
        </div>
        <div>
          <NavLink to="/resources/1" className="rounded-md p-2 hover:(bg-zinc-100)">
            字幕组
          </NavLink>
        </div>
        <div>
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
