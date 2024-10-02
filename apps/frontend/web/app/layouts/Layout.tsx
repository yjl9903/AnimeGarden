import { NavLink } from '@remix-run/react';

import Search from '~/components/Search';
import { Sidebar } from '~/components/Sidebar';

import { Loading } from './Loading';

const NavHeight = 68;
const MaxPaddingTop = 152;
const MaxPaddingBottom = 96;
const SearchHeight = NavHeight;

export default function Layout(props: { children?: React.ReactNode; feedURL?: string }) {
  const { feedURL } = props;

  return (
    <div className="w-full" style={{ '--nav-height': `${NavHeight - 2}px` }}>
      <Hero feedURL={feedURL}></Hero>
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

function Hero(props: { feedURL?: string }) {
  return (
    <div className="w-full">
      <div
        className="hero z-1 w-full fixed bg-[#fef8f7] border-b border-b-gray-200"
        // style={{ height: `${height}px` }}
      ></div>
      <Header feedURL={props.feedURL}></Header>
      <div
        className="hidden hero-top z-10 fixed w-full pt-5rem pb-3rem text-4xl font-quicksand font-bold text-center select-none outline-none pointer-events-none"
        suppressHydrationWarning={true}
        // style={{ top: `${paddingTop - MaxPaddingTop}px` }}
      >
        <NavLink to="/" className="pointer-events-auto cursor-pointer">
          🌸 Anime Garden
        </NavLink>
      </div>
      <div
        className="hero-search w-full flex justify-center items-center fixed md:z-12 lt-md:z-10 pointer-events-none"
        suppressHydrationWarning={true}
        style={{
          height: `${NavHeight}px`,
          // top: `${paddingTop}px`,
          paddingTop: '8px',
          paddingBottom: '8px'
        }}
      >
        <div className="vercel relative h-[44.4px] xl:w-[800px] md:w-[600px] lt-md:w-[95vw] max-w-[95vw] pointer-events-auto">
          <Search></Search>
        </div>
      </div>
      <div
        className="hero-bottom z-10 fixed w-full"
        suppressHydrationWarning={true}
        // style={{ top: `${paddingTop + SearchHeight}px`, height: `${paddingBottom}px` }}
      ></div>
    </div>
  );
}

function Header(props: { feedURL?: string }) {
  const { feedURL } = props;

  return (
    <div className="z-11 bg-[#fef8f7] fixed pt-[1px] flex justify-center items-center w-full h-$nav-height">
      <nav className="main flex gap-3 [&>div]:leading-$nav-height">
        <div className="box-content w-[32px] pl3 lt-sm:pl1 text-2xl text-center font-quicksand font-bold">
          <NavLink to="/">🌸</NavLink>
        </div>
        <div>
          <NavLink to="/" className="rounded-md p-2 hover:(bg-zinc-100)">
            动画
          </NavLink>
        </div>
        <div>
          <NavLink to="/resources" className="rounded-md p-2 hover:(bg-zinc-100)">
            字幕组
          </NavLink>
        </div>
        <div>
          <NavLink to="/resources" className="rounded-md p-2 hover:(bg-zinc-100)">
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
    </div>
  );
}
