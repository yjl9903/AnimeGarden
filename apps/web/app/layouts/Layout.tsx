import clsx from 'clsx';
import { memo, useEffect } from 'react';
import { NavLink } from '@remix-run/react';
import { useAtomValue } from 'jotai';

import { currentThemeAtom } from '~/states';

import Search from './Search';
import { Footer } from './Footer';
import { Header } from './Header';
import { Loading } from './Loading';
import { isOpenSidebar, Sidebar } from './Sidebar';

export const NavHeight = 66;

export const SearchTop = 128;

export const HeroHeight = 300;

export interface LayoutProps {
  children?: React.ReactNode;

  timestamp?: string;

  feedURL?: string;

  /**
   * @default true
   */
  heading?: boolean;
}

export default function Layout(props: LayoutProps) {
  const { timestamp, feedURL, heading } = props;
  const isOpen = useAtomValue(isOpenSidebar);
  const theme = useAtomValue(currentThemeAtom);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <>
      <Hero feedURL={feedURL} heading={heading}></Hero>
      <div className={clsx('w-full flex', isOpen ? 'main-with-sidebar' : 'main-without-sidebar')}>
        <Sidebar></Sidebar>
        <div className="flex-auto flex items-center justify-center min-h-[calc(100vh-300px-220px)]">
          <main className="main">{props.children}</main>
        </div>
      </div>
      <Footer timestamp={timestamp} feedURL={feedURL}></Footer>
      <Loading></Loading>
    </>
  );
}

const Hero = memo((props: { feedURL?: string; heading?: boolean }) => {
  return (
    <>
      <search
        id="hero-search"
        className="w-full h-$nav-height z-12 flex items-center justify-center pointer-events-none"
        suppressHydrationWarning={true}
      >
        <div className="vercel relative h-[44.4px] xl:w-[640px] lg:w-[600px] md:w-[500px] lt-md:w-[calc(100vw-116px)] pointer-events-auto">
          <Search></Search>
        </div>
      </search>
      <Header feedURL={props.feedURL}></Header>
      <div
        id="hero-banner"
        className="w-full h-$hero-height bg-hero"
        suppressHydrationWarning={true}
      >
        {props.heading === false ? (
          <div className="lg:z-12 lt-lg:z-10 w-full pt-5rem pb-3rem text-4xl font-quicksand font-bold text-center select-none outline-none pointer-events-none">
            <NavLink to="/" className="pointer-events-auto cursor-pointer">
              <span>🌸 Anime Garden</span>
            </NavLink>
          </div>
        ) : (
          <h1 className="lg:z-12 lt-lg:z-10 w-full pt-5rem pb-3rem text-4xl font-quicksand font-bold text-center select-none outline-none pointer-events-none">
            <NavLink to="/" className="pointer-events-auto cursor-pointer">
              <span>🌸 Anime Garden</span>
            </NavLink>
          </h1>
        )}
      </div>
      <div
        id="hero-placeholder"
        className="w-full h-$nav-height hidden z-1"
        suppressHydrationWarning={true}
      ></div>
    </>
  );
});
