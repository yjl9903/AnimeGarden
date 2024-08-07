import { NavLink } from '@remix-run/react';
import { atom, useAtom } from 'jotai';
import { useEffect, useRef, useState } from 'react';

import { useDocumentScroll } from '~/hooks';

const NavHeight = 40;

const TitleHeight = 152;

export const heroHeightAtom = atom((get) => NavHeight + TitleHeight);

export default function Layout(props: { children?: React.ReactNode }) {
  const { x, y } = useDocumentScroll();
  const [heroHeight] = useAtom(heroHeightAtom);

  return (
    <div className="w-full" style={{ '--hero-height': `${heroHeight}px` }}>
      <Header scrollY={y}></Header>
      <div className="flex pt-$hero-height">
        <div className="w-[300px] border-r-1 h-[150vh]"></div>
        <div className="flex-auto">{props.children}</div>
      </div>
    </div>
  );
}



function Header(props: { scrollY: number }) {
  const { scrollY } = props;
  const [heroHeight, setHeroHeright] = useAtom(heroHeightAtom);

  const titleTop = Math.min(TitleHeight, scrollY);

  return (
    <div className="w-full fixed bg-[#fef8f7]" style={{ height: `${heroHeight}px` }}>
      <nav className="px-8 py-2 flex gap-2">
        <div>🌸 Anime Garden</div>
        <div>动画</div>
      </nav>
      <div className='w-full'>
        <div className="w-full pt-4rem pb-3rem text-4xl font-quicksand font-bold text-center select-none outline-none absolute" style={{ top: `-${titleTop}px` }}>
          <NavLink to="/">🌸 Anime Garden</NavLink>
        </div>
        <div className="w-full pt-4 flex justify-center pb-6rem absolute" style={{ top: `${TitleHeight - titleTop}px` }}>
          <div className="rounded-md h-16 w-[600px] border bg-white"></div>
        </div>
      </div>
    </div>
  );
}
