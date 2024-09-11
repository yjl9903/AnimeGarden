import { NavLink } from '@remix-run/react';
import { atom, useAtom } from 'jotai';
import { useEffect, useRef, useState } from 'react';

import { useDocumentScroll } from '~/hooks';

const NavHeight = 68;
const MaxPaddingTop = 152;
const MaxPaddingBottom = 36;
const SearchHeight = NavHeight;

// const heroHeightAtom = atom((get) => NavHeight + MaxTitleHeight);

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
        <div className="w-[300px] border-r-1 h-[150vh]"></div>
        <div className="flex-auto">{props.children}</div>
      </div>
    </div>
  );
}

function Hero(props: { height: number, paddingTop: number; paddingBottom: number }) {
  const { height, paddingTop, paddingBottom } = props;

  return (
    <div className="w-full fixed bg-[#fef8f7]" style={{ height: `${height}px` }}>
      <nav className="px-8 h-$nav-height flex gap-2 z-1">
        <div className="leading-$nav-height">🌸 Anime Garden</div>
        <div className="leading-$nav-height">动画</div>
      </nav>
      <div className="hero-top w-full pt-4rem pb-3rem text-4xl font-quicksand font-bold text-center select-none outline-none absolute" style={{ top: `${paddingTop - MaxPaddingTop}px` }}>
        <NavLink to="/">🌸 Anime Garden</NavLink>
      </div>
      <div className="w-full flex justify-center absolute z-10" style={{ top: `${paddingTop}px`, paddingTop: '8px', paddingBottom: '8px' }}>
        <div className="rounded-md h-[52px] w-[600px] border bg-white"></div>
      </div>
      <div className="hero-bottom w-full absolute" style={{ top: `${paddingTop + SearchHeight}px`, height: `${paddingBottom}px` }}></div>
    </div>
  );
}
