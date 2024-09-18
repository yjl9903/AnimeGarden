import { NavLink } from '@remix-run/react';

import Search from '~/components/Search';
import { Sidebar } from '~/components/Sidebar';
import { useDocumentScroll } from '~/hooks';

import { Loading } from './Loading';

import './layouts.css';

const NavHeight = 68;
const MaxPaddingTop = 152;
const MaxPaddingBottom = 96;
const SearchHeight = NavHeight;

export default function Layout(props: { children?: React.ReactNode; rss?: string }) {
  const { rss } = props;

  return (
    <div className="w-full" style={{ '--nav-height': `${NavHeight - 2}px` }}>
      <Hero rss={rss}></Hero>
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
      <Loading></Loading>
    </div>
  );
}

export const useHero = () => {
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

function Hero(props: { rss?: string }) {
  const { height, paddingTop, paddingBottom, injectScript } = useHero();

  return (
    <div className="w-full">
      <div
        className="hero z-1 w-full fixed bg-[#fef8f7] border-b border-b-gray-200"
        suppressHydrationWarning={true}
        style={{ height: `${height}px` }}
      ></div>
      <Header rss={props.rss}></Header>
      <div
        className="hero-top z-10 fixed w-full pt-5rem pb-3rem text-4xl font-quicksand font-bold text-center select-none outline-none pointer-events-none"
        suppressHydrationWarning={true}
        style={{ top: `${paddingTop - MaxPaddingTop}px` }}
      >
        <NavLink to="/" className="pointer-events-auto cursor-pointer">
          🌸 Anime Garden
        </NavLink>
      </div>
      <div
        className="hero-search w-full flex justify-center fixed md:z-12 lt-md:z-10 pointer-events-none"
        suppressHydrationWarning={true}
        style={{ top: `${paddingTop}px`, paddingTop: '8px', paddingBottom: '8px' }}
      >
        <div className="h-[52px] w-[600px] max-w-[95vw] pointer-events-auto">
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

function Header(props: { rss?: string }) {
  const { rss } = props;

  return (
    <div className="z-11 bg-[#fef8f7] fixed pt-[1px] flex justify-center items-center w-full h-$nav-height">
      <nav className="main flex gap-4 [&>div]:leading-$nav-height">
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
            字幕组
          </NavLink>
        </div>
        <div>
          <NavLink to="/resources" className="rounded-md p-2 hover:(bg-neutral-200)">
            资源
          </NavLink>
        </div>
        <div className="flex-auto"></div>
        <div>
          {rss && (
            <a
              href={rss}
              target="_blank"
              className="inline cursor-pointer rounded-md p-2 text-[#ee802f] hover:(!text-[#ff7800] !border-b-[#ff7800] bg-neutral-200)"
            >
              <span className="i-carbon-rss mr1" />
              <span>RSS</span>
            </a>
          )}
        </div>
      </nav>
    </div>
  );
}
