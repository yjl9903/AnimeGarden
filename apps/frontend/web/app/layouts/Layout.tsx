import { NavLink } from '@remix-run/react';
import { useEffect, useState } from 'react';

import Search from '~/components/Search';
import { Sidebar } from '~/components/Sidebar';
import { useDocumentScroll } from '~/hooks';

const NavHeight = 68;
const MaxPaddingTop = 152;
const MaxPaddingBottom = 36;
const SearchHeight = NavHeight;

export const useHero = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { y } = useDocumentScroll();

  const paddingTop = y <= MaxPaddingTop ? MaxPaddingTop - y : 0;

  const paddingBottom = Math.max(
    y > MaxPaddingTop ? MaxPaddingBottom - (y - MaxPaddingTop) : MaxPaddingBottom,
    0
  );

  const height = paddingTop + SearchHeight + paddingBottom;

  return {
    height,
    paddingTop,
    paddingBottom,
    injectScript: `requestAnimationFrame(() => {
  const y = document.documentElement.scrollTop;
  const paddingTop = y <= ${MaxPaddingTop} ? ${MaxPaddingTop} - y : 0;
  const paddingBottom = Math.max(
    y > ${MaxPaddingTop} ? ${MaxPaddingBottom} - (y - ${MaxPaddingTop}) : ${MaxPaddingBottom},
    0
  );
  const height = paddingTop + ${SearchHeight} + paddingBottom;

  const hero = document.querySelector('.hero');
  if (hero) hero.style.height = height + 'px';
  const top = document.querySelector('.hero-top');
  if (top) top.style.top = (paddingTop - ${MaxPaddingTop}) + 'px';
  const search = document.querySelector('.hero-search');
  if (search) search.style.top = paddingTop + 'px';
  const bottom = document.querySelector('.hero-bottom');
  if (bottom) { bottom.style.top = (paddingTop + ${SearchHeight}) + 'px'; bottom.style.height = paddingBottom + 'px'; }
});`
  };
};

export default function Layout(props: { children?: React.ReactNode }) {
  return (
    <div className="w-full" style={{ '--nav-height': `${NavHeight}px` }}>
      <Hero></Hero>
      <div
        className="flex"
        style={{ paddingTop: `${MaxPaddingTop + NavHeight + MaxPaddingBottom}px` }}
      ></div>
      <div className="w-full flex">
        <Sidebar></Sidebar>
        <div className="flex-auto flex items-center">
          <div className="main">{props.children}</div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  const { height, paddingTop, paddingBottom, injectScript } = useHero();

  return (
    <div className="w-full">
      <div
        className="hero z-1 w-full fixed bg-[#fef8f7] border-b border-b-gray-200"
        suppressHydrationWarning={true}
        style={{ height: `${height}px` }}
      ></div>
      <Header></Header>
      <div
        className="hero-top z-10 fixed w-full pt-4rem pb-3rem text-4xl font-quicksand font-bold text-center select-none outline-none pointer-events-none"
        suppressHydrationWarning={true}
        style={{ top: `${paddingTop - MaxPaddingTop}px` }}
      >
        <NavLink to="/" className="pointer-events-auto cursor-pointer">
          🌸 Anime Garden
        </NavLink>
      </div>
      <div
        className="hero-search w-full flex justify-center fixed z-10"
        suppressHydrationWarning={true}
        style={{ top: `${paddingTop}px`, paddingTop: '8px', paddingBottom: '8px' }}
      >
        <div className="h-[52px]">
          <Search></Search>
        </div>
      </div>
      <div
        className="hero-bottom z-10 fixed w-full"
        suppressHydrationWarning={true}
        style={{ top: `${paddingTop + SearchHeight}px`, height: `${paddingBottom}px` }}
      ></div>
      {injectScript && (
        <script
          dangerouslySetInnerHTML={{
            __html: injectScript
          }}
        />
      )}
    </div>
  );
}

function Header() {
  return (
    <nav className="z-11 fixed w-full px-8 h-$nav-height flex gap-4 [&>div]:leading-$nav-height">
      <div className="text-2xl font-quicksand font-bold">
        <NavLink to="/">🌸</NavLink>
      </div>
      <div>
        <NavLink to="/" className="rounded-md p-2 hover:(bg-neutral-200)">
          动画
        </NavLink>
      </div>
      <div>
        <NavLink to="/resources" className="rounded-md p-2 hover:(bg-neutral-200)">
          资源
        </NavLink>
      </div>
      <div className="flex-auto"></div>
      <div>
        <a
          href={''}
          target="_blank"
          className="inline cursor-pointer rounded-md p-2 text-[#ee802f] hover:(!text-[#ff7800] !border-b-[#ff7800] bg-neutral-200)"
        >
          <span className="i-carbon-rss mr1" />
          <span>RSS</span>
        </a>
      </div>
    </nav>
  );
}
