import clsx from 'clsx';
import { memo, useMemo } from 'react';
import { NavLink, useLocation } from '@remix-run/react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';

import { getActivePageTab } from '~/utils/routes';
import { collectionsAtom, type Collection } from '~/states/collection';

import './sidebar.css';
import { isOpenSidebar } from './atom';

export const Sidebar = memo(() => {
  const [isOpen] = useAtom(isOpenSidebar);

  return (
    <div className="sidebar-root">
      {!isOpen && <SidebarTrigger></SidebarTrigger>}
      {isOpen && <SidebarContent></SidebarContent>}
    </div>
  );
});

const SidebarTrigger = memo(() => {
  const setIsOpen = useSetAtom(isOpenSidebar);

  return (
    <div className="sidebar-trigger font-quicksand font-500" onClick={() => setIsOpen(true)}>
      <span className="i-carbon:bookmark text-sm relative top-[2px] mr1"></span>
      <span className="text-sm">收藏夹</span>
    </div>
  );
});

const SidebarContent = memo(() => {
  const setIsOpen = useSetAtom(isOpenSidebar);
  const collections = useAtomValue(collectionsAtom);

  return (
    <div className="sidebar-wrapper space-y-2">
      <div className="mt-[8px] px2 py1 text-base-700 select-none font-500 font-quicksand flex items-center">
        <div className="block">
          <span className="i-carbon:bookmark text-sm relative top-[2px] mr1"></span>
          <span className="text-sm">收藏夹</span>
        </div>
        <div className="flex-auto"></div>
        <div
          className="h-[26px] w-auto rounded-md px-1 flex items-center cursor-pointer hover:bg-layer-muted"
          onClick={() => setIsOpen(false)}
        >
          <span className="i-fluent:panel-right-expand-16-regular w-[1em]"></span>
        </div>
      </div>
      <QuickLinks></QuickLinks>
      <Collection collection={collections[0]}></Collection>
    </div>
  );
});

const QuickLinks = memo(() => {
  const location = useLocation();
  const match = useMemo(() => getActivePageTab(location), [location]);
  const className =
    'ml1 mr2 px1 py2 cursor-pointer select-none block text-sm text-base-700 flex items-center hover:bg-layer-subtle-overlay rounded-md';
  const activeClassName = 'bg-layer-muted';

  return (
    <>
      <NavLink
        to="/"
        className={clsx(className, match === 'index' && activeClassName)}
        preventScrollReset={true}
      >
        <span className="i-carbon-calendar mr1"></span>
        <span>动画周历</span>
      </NavLink>
      <NavLink
        to="/resources/1"
        className={clsx(className, match === 'resources' && activeClassName)}
        preventScrollReset={true}
      >
        <span className="i-carbon-list mr1"></span>
        <span>所有资源</span>
      </NavLink>
    </>
  );
});

const Collection = memo((props: { collection: Collection }) => {
  const { collection } = props;

  return (
    <div>
      <div className="px2 flex items-center text-sm">
        <NavLink to={`/collection`} className={'block text-xs text-base-500 text-link-active'}>
          <span className="select-none">{collection.name}</span>
        </NavLink>
        <div className="flex-auto flex items-center pl-2 pr-1">
          <div className="h-[1px] w-full bg-zinc-200"></div>
        </div>
        <div className="h-[26px] w-auto rounded-md px-1 flex items-center cursor-pointer hover:bg-layer-muted">
          <span className="i-carbon-share"></span>
        </div>
      </div>
      {collection.items.length > 0 ? (
        <div></div>
      ) : (
        <NavLink to='/resources/1?search=%5B"败犬女主太多了"%5D&type=動畫' className="h-[80px] px2 flex items-center justify-center text-base-700 text-link-active">
          <span className="text-sm">收藏一个搜索条件吧</span>
          <span className="i-carbon:arrow-up-right"></span>
        </NavLink>
      )}
      <div className="px2 flex items-center">
        <div className="h-[1px] w-full bg-zinc-200"></div>
      </div>
    </div>
  );
});
