import Search from '@/components/Search';
import { Sidebar } from '@/components/Sidebar';
import { NavLink } from '@remix-run/react';
import { atom, useAtom } from 'jotai';
import { useEffect, useRef, useState } from 'react';

import { useDocumentScroll } from '~/hooks';

const NavHeight = 68;
const MaxPaddingTop = 152;
const MaxPaddingBottom = 36;
const SearchHeight = NavHeight;

export const useHero = () => {
  const { y } = useDocumentScroll();

  const paddingTop = y <= MaxPaddingTop ? MaxPaddingTop - y : 0;

  const paddingBottom = Math.max(y > MaxPaddingTop ? MaxPaddingBottom - (y - MaxPaddingTop) : MaxPaddingBottom, 0);

  const height = paddingTop + SearchHeight + paddingBottom;

  return { height, paddingTop, paddingBottom };
};

export default function Layout(props: { children?: React.ReactNode }) {
  const { height, paddingTop, paddingBottom } = useHero();

  return (
    <div className="w-full" style={{ '--nav-height': `${NavHeight}px` }}>
      <Hero height={height} paddingTop={paddingTop} paddingBottom={paddingBottom}></Hero>
      <div className="flex" style={{ paddingTop: `${MaxPaddingTop + NavHeight + MaxPaddingBottom}px` }}>
        <Sidebar></Sidebar>
        <div className="flex-auto flex items-center">
          <div className="main">{props.children}</div>
        </div>
      </div>
    </div>
  );
}

function Hero(props: { height: number, paddingTop: number; paddingBottom: number }) {
  const { height, paddingTop, paddingBottom } = props;

  return (
    <div className="w-full fixed bg-[#fef8f7]" style={{ height: `${height}px` }}>
      <Header></Header>
      <div className="hero-top w-full pt-4rem pb-3rem text-4xl font-quicksand font-bold text-center select-none outline-none absolute pointer-events-none" style={{ top: `${paddingTop - MaxPaddingTop}px` }}>
        <NavLink to="/" className="pointer-events-auto cursor-pointer">🌸 Anime Garden</NavLink>
      </div>
      <div className="w-full flex justify-center absolute z-10" style={{ top: `${paddingTop}px`, paddingTop: '8px', paddingBottom: '8px' }}>
        <div className="h-[52px]">
          <Search></Search>
        </div>
      </div>
      <div className="hero-bottom w-full absolute" style={{ top: `${paddingTop + SearchHeight}px`, height: `${paddingBottom}px` }}></div>
    </div>
  );
}

function Header() {
  return <nav className="px-8 h-$nav-height flex gap-4 z-1 [&>div]:leading-$nav-height">
    <div className="text-2xl font-quicksand font-bold"><NavLink to="/">🌸</NavLink></div>
    <div><NavLink to="/" className="rounded-md p-2 hover:(bg-neutral-200)">动画</NavLink></div>
    <div><NavLink to="/resources" className="rounded-md p-2 hover:(bg-neutral-200)">资源</NavLink></div>
    <div className='flex-auto'></div>
    <div>
      <a
        href={''}
        target="_blank"
        className="inline cursor-pointer rounded-md p-2 text-[#ee802f] hover:(!text-[#ff7800] !border-b-[#ff7800] bg-neutral-200)"
      >
        <span className="i-carbon-rss mr1" /><span>RSS</span>
      </a>
    </div>
  </nav>
}