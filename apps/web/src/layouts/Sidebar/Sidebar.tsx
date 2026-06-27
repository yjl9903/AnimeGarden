import clsx from 'clsx';
import { toast } from 'sonner';
import { ClientOnly, Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useSelector } from '@tanstack/react-store';
import { useMutation } from '@tanstack/react-query';
import { type MouseEvent, memo, useCallback, useMemo } from 'react';

import type { Collection } from '@animegarden/client';

import { generateCollectionMutationOptions } from '~/query';
import { track } from '~/utils';
import { getActivePageTab, getResourcesRouteLink } from '~/utils/routes';
import { updateCollection } from '~/stores/collection';
import { useAppStores } from '~/stores/hooks';

import { CollectionItemContent } from './Collection';

export const Sidebar = memo(() => {
  const { isOpenSidebarStore } = useAppStores();
  const isOpen = useSelector(isOpenSidebarStore);

  return (
    <div className="sidebar-root" suppressHydrationWarning={true}>
      <ClientOnly>
        <>
          {!isOpen && <SidebarTrigger></SidebarTrigger>}
          {isOpen && <SidebarContent></SidebarContent>}
        </>
      </ClientOnly>
    </div>
  );
});

const SidebarTrigger = memo(() => {
  const { isOpenSidebarStore } = useAppStores();

  return (
    <div
      className="sidebar-trigger font-quicksand font-500"
      onClick={() => {
        isOpenSidebarStore.setState(() => true);
        track('collection.open-sidebar');
      }}
    >
      <span className="i-carbon:bookmark text-sm relative top-[2px] mr1"></span>
      <span className="text-sm">收藏夹</span>
    </div>
  );
});

const SidebarContent = memo(() => {
  const { currentCollectionStore, isOpenSidebarStore } = useAppStores();
  const collection = useSelector(currentCollectionStore);

  return (
    <div className="sidebar-wrapper space-y-2">
      <div className="mt-[8px] px2 py1 text-base-700 select-none font-500 font-quicksand flex items-center">
        <div className="block">
          <span className="i-carbon:bookmark text-sm relative top-[2px] mr1"></span>
          <span className="text-sm font-bold">收藏夹</span>
        </div>
        <div className="flex-auto"></div>
        <div
          className="h-[26px] w-auto rounded-md px-1 flex items-center cursor-pointer hover:bg-layer-muted"
          onClick={() => isOpenSidebarStore.setState(() => false)}
        >
          <span className="i-fluent:panel-right-expand-16-regular w-[1em]"></span>
        </div>
      </div>
      {collection && (
        <>
          <QuickLinks collection={collection}></QuickLinks>
          <Collection collection={collection}></Collection>
        </>
      )}
    </div>
  );
});

const QuickLinks = memo((props: { collection: Collection }) => {
  const { collection } = props;
  const location = useLocation();
  const match = useMemo(() => getActivePageTab(location, collection), [location, collection]);
  const className =
    'ml1 mr2 px1 py2 cursor-pointer select-none text-sm text-base-700 flex items-center hover:bg-layer-subtle-overlay rounded-md';
  const activeClassName = 'bg-layer-muted';

  return (
    <>
      <Link
        to="/anime"
        className={clsx(className, match === 'anime' && activeClassName)}
        resetScroll={false}
      >
        <span className="i-carbon-calendar mr1"></span>
        <span>动画周历</span>
      </Link>
      <Link
        {...getResourcesRouteLink(1)}
        className={clsx(className, match === 'resources' && activeClassName)}
        resetScroll={false}
      >
        <span className="i-carbon-list mr1"></span>
        <span>所有资源</span>
      </Link>
      <a
        href="https://docs.animes.garden/animegarden/search"
        className={clsx(className)}
        target="_blank"
      >
        <span className="i-carbon-help mr1"></span>
        <span>高级搜索帮助</span>
      </a>
    </>
  );
});

const Collection = memo((props: { collection: Collection<true> }) => {
  const { collection } = props;

  const location = useLocation();
  const navigate = useNavigate();
  const stores = useAppStores();
  const generateCollectionMutation = useMutation(generateCollectionMutationOptions());

  const match = useMemo(() => getActivePageTab(location, collection), [location, collection]);

  const createCollection = useCallback(async () => {
    if (!collection.authorization) {
      const authorization = crypto.randomUUID();
      updateCollection(stores, collection, { authorization });
    }

    const resp = await generateCollectionMutation.mutateAsync(collection);
    console.log('创建收藏夹', resp);

    if (resp) {
      updateCollection(stores, collection, { hash: resp.hash });
      return resp;
    }
  }, [collection, generateCollectionMutation, stores]);

  const onClickCollection = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault();
      const resp = await createCollection();
      if (resp) {
        navigate({ to: '/collection/$hash', params: { hash: resp.hash } });
        track('collection.open', { hash: resp.hash || '' });
      }
    },
    [createCollection]
  );
  const onClickShare = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault();

      const resp = collection.hash ? collection : await createCollection();

      if (resp) {
        const url = new URL(`/collection/${resp.hash}`, window.location.origin);
        await navigator.clipboard.writeText(url.toString());
        toast.success(`复制 ${collection.name} 分享链接成功`, {
          dismissible: true,
          duration: 3000,
          closeButton: true,
          position: 'top-right'
        });
        track('collection.share', { hash: resp.hash || '' });
      } else {
        toast.warning(`复制 ${collection.name} 分享链接失败`, {
          dismissible: true,
          duration: 3000,
          closeButton: true,
          position: 'top-right'
        });
      }
    },
    [collection, createCollection]
  );

  return (
    <div>
      <div className="px2 flex items-center text-sm">
        {collection.hash ? (
          <Link
            to="/collection/$hash"
            params={{ hash: collection.hash }}
            className={'block text-xs text-base-500 text-link-active'}
          >
            <span className="select-none">{collection.name}</span>
          </Link>
        ) : (
          <a
            href="/collection/"
            className={'block text-xs text-base-500 text-link-active'}
            onClick={onClickCollection}
          >
            <span className="select-none">{collection.name}</span>
          </a>
        )}
        <div className="flex-auto flex items-center pl-2 pr-1">
          <div className="h-[1px] w-full bg-zinc-200"></div>
        </div>
        <div
          className="h-[26px] w-auto rounded-md px-1 flex items-center cursor-pointer hover:bg-layer-muted"
          onClick={onClickShare}
        >
          <span className="i-carbon-share"></span>
        </div>
      </div>
      {collection.filters.length > 0 ? (
        <div className="collection-container py-[1px] pr-[1px] space-y-2 overflow-y-auto">
          {collection.filters.map((item) => (
            <CollectionItemContent
              key={item.searchParams}
              collection={collection}
              item={item}
              active={match === item.searchParams}
            ></CollectionItemContent>
          ))}
        </div>
      ) : (
        <Link
          {...getResourcesRouteLink(1, 'search=败犬女主太多了&type=动画')}
          className="h-[80px] px2 flex items-center justify-center text-base-700 text-link-active"
        >
          <span className="text-sm">收藏一个搜索条件吧</span>
          <span className="i-carbon:arrow-up-right"></span>
        </Link>
      )}
      <div className="mt2 px2 flex items-center">
        <div className="h-[1px] w-full bg-zinc-200"></div>
      </div>
    </div>
  );
});
