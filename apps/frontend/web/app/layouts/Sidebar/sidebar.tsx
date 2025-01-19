import clsx from 'clsx';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { NavLink, useLocation } from '@remix-run/react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { memo, useCallback, useMemo, useRef, useState } from 'react';

import { findFansub } from '@animegarden/client';

import { APP_HOST } from '~build/env';

import { generateFeed } from '~/utils/feed';
import { getActivePageTab } from '~/utils/routes';
import { collectionsAtom, type Collection } from '~/states/collection';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { resolveFilterOptions } from '~/routes/resources.($page)/Filter';
import { base64URLencode } from '~/utils/json';

import { stringifySearch } from '../Search/utils';

import './sidebar.css';
import { isOpenSidebar } from './atom';

type CollectionItem = Collection['items'][0];

const safeFormat: typeof format = (...args) => {
  try {
    return format(...args);
  } catch (error) {
    console.log(error);
    return '';
  }
};

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
          <span className="text-sm font-bold">收藏夹</span>
        </div>
        <div className="flex-auto"></div>
        <div
          className="h-[26px] w-auto rounded-md px-1 flex items-center cursor-pointer hover:bg-layer-muted"
          onClick={() => setIsOpen(false)}
        >
          <span className="i-fluent:panel-right-expand-16-regular w-[1em]"></span>
        </div>
      </div>
      <QuickLinks collection={collections[0]}></QuickLinks>
      <Collection collection={collections[0]}></Collection>
    </div>
  );
});

const QuickLinks = memo((props: { collection: Collection }) => {
  const { collection } = props;
  const location = useLocation();
  const match = useMemo(() => getActivePageTab(location, collection), [location, collection]);
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
      <a
        href="https://animespace.onekuma.cn/animegarden/search"
        className={clsx(className)}
        target="_blank"
      >
        <span className="i-carbon-help mr1"></span>
        <span>高级搜索帮助</span>
      </a>
    </>
  );
});

const Collection = memo((props: { collection: Collection }) => {
  const location = useLocation();
  const { collection } = props;
  const match = useMemo(() => getActivePageTab(location, collection), [location, collection]);

  return (
    <div>
      <div className="px2 flex items-center text-sm">
        <NavLink
          to={`/collection/filter/${base64URLencode(JSON.stringify(collection))}`}
          className={'block text-xs text-base-500 text-link-active'}
        >
          <span className="select-none">{collection.name}</span>
        </NavLink>
        <div className="flex-auto flex items-center pl-2 pr-1">
          <div className="h-[1px] w-full bg-zinc-200"></div>
        </div>
        <a
          className="block h-[26px] w-auto rounded-md px-1 flex items-center cursor-pointer hover:bg-layer-muted"
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`看看动画`)}&url=${encodeURIComponent(`https://${APP_HOST}/collection/filter/${base64URLencode(JSON.stringify(collection))}`)}`}
          target="_blank"
        >
          <span className="i-carbon-share"></span>
        </a>
      </div>
      {collection.items.length > 0 ? (
        <div className="collection-container py-[1px] pr-[1px] space-y-2 overflow-y-auto">
          {collection.items.map((item) => (
            <CollectionItemContent
              key={item.searchParams}
              collection={collection}
              item={item}
              active={match === item.searchParams}
            ></CollectionItemContent>
          ))}
        </div>
      ) : (
        <NavLink
          to='/resources/1?search=%5B"败犬女主太多了"%5D&type=動畫'
          className="h-[80px] px2 flex items-center justify-center text-base-700 text-link-active"
        >
          <span className="text-sm">收藏一个搜索条件吧</span>
          <span className="i-carbon:arrow-up-right"></span>
        </NavLink>
      )}
      <div className="mt2 px2 flex items-center">
        <div className="h-[1px] w-full bg-zinc-200"></div>
      </div>
    </div>
  );
});

const CollectionItemContent = memo(
  (props: { collection: Collection; item: CollectionItem; active: boolean }) => {
    const { collection, item, active } = props;
    const name = inferCollectionItemName(props.item);
    const fansub = name.fansubs?.map((f) => f.name).join(' ');
    const title = item.name
      ? item.name
      : name.title
        ? name.title + (fansub ? ' 字幕组:' + fansub : '')
        : name.text!;
    const [collections, setCollections] = useAtom(collectionsAtom);
    const display = useMemo(() => resolveFilterOptions(item), [item]);

    // --- Open state
    const [tipOpen, setTipOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const copyRSS = useCallback(async () => {
      const feedURL = generateFeed(new URLSearchParams(item.searchParams));
      try {
        if (!feedURL) throw new Error(`RSS URL is empty`);
        await navigator.clipboard.writeText(`https://${APP_HOST}/feed.xml?filter=${feedURL}`);
        toast.success('复制 RSS 订阅成功', {
          dismissible: true,
          duration: 3000,
          closeButton: true
        });
      } catch (error) {
        console.error(error);
        toast.error('复制 RSS 订阅失败', { closeButton: true });
      }
    }, [item]);

    const deleteItem = useCallback(() => {
      const newCollections = collections.map((c) => {
        if (c.name === collection.name) {
          const idx = c.items.findIndex((i) => i.searchParams === item.searchParams);
          if (idx !== -1) {
            return {
              ...c,
              items: [...c.items.slice(0, idx), ...c.items.slice(idx + 1)]
            };
          }
        }
        return c;
      });
      setCollections(newCollections);
    }, [collection, item, collections, setCollections]);

    // --- Rename title
    const titleRef = useRef<HTMLSpanElement>(null);
    const focusTime = useRef<number>();
    const [editable, setEditable] = useState(false);
    const focusTitle = useCallback(() => {
      focusTime.current = new Date().getTime();
      const dom = titleRef.current;
      dom?.focus();
      // 设置选区
      const selection = window.getSelection();
      if (dom && selection) {
        selection.removeAllRanges();
        const range = document.createRange();
        range.selectNodeContents(dom);
        range.collapse(false);
        selection.addRange(range);
      }
    }, []);
    const startRename = useCallback(() => {
      if (editable) return;
      setEditable(true);
      setTimeout(() => {
        focusTitle();
      });
    }, [titleRef, editable, setEditable]);
    const commitRename = useCallback(() => {
      const dom = titleRef.current;
      if (!dom) return;
      const newTitle = dom.textContent || title;
      if (!newTitle) return;

      const newCollections = collections.map((c) => {
        if (c.name === collection.name) {
          const idx = c.items.findIndex((i) => i.searchParams === item.searchParams);
          if (idx !== -1) {
            return {
              ...c,
              items: [
                ...c.items.slice(0, idx),
                { ...item, name: newTitle },
                ...c.items.slice(idx + 1)
              ]
            };
          }
        }
        return c;
      });
      setEditable(false);
      setCollections(newCollections);
    }, [setEditable, collection, item, title, collections, setCollections]);
    const handleTitleKeydown = useCallback(
      (e: React.KeyboardEvent) => {
        if (!editable) return;
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          commitRename();
        }
      },
      [editable, commitRename]
    );
    const handleTitleBlur = useCallback(
      (e: React.FocusEvent) => {
        if (!editable) return;
        // Blur immediate after focus
        if (new Date().getTime() - (focusTime.current ?? 0) < 200) {
          focusTitle();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        commitRename();
      },
      [editable, commitRename]
    );
    // --- Rename title

    return (
      <TooltipProvider delayDuration={300} skipDelayDuration={100}>
        <Tooltip
          open={tipOpen}
          onOpenChange={(flag) => {
            if (menuOpen || editable) {
              setTipOpen(false);
            } else {
              setTipOpen(flag);
            }
          }}
        >
          <TooltipTrigger asChild>
            <NavLink
              to={`/resources/1${item.searchParams}`}
              key={item.searchParams}
              className={clsx(
                'collection-item hover:bg-layer-subtle-overlay rounded-md text-base-800 text-xs',
                active && 'bg-layer-muted'
              )}
              onClick={(e) => {
                if (editable) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            >
              <span
                ref={titleRef}
                className="collection-item-title"
                contentEditable={editable ? 'plaintext-only' : 'false'}
                suppressContentEditableWarning={true}
                onKeyDown={handleTitleKeydown}
                onBlur={handleTitleBlur}
              >
                {title}
              </span>
              <DropdownMenu
                modal={false}
                open={menuOpen}
                onOpenChange={(flag) => {
                  setMenuOpen(flag);
                  setTipOpen(false);
                }}
              >
                <DropdownMenuTrigger
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setTipOpen(false);
                  }}
                >
                  <span className="collection-item-op hidden absolute h-full top-0 right-[4px] py-[1px] justify-center items-center">
                    <span className="w-[16px] items-center justify-center hover:bg-layer-mask rounded-md">
                      <span className="i-ant-design:more-outlined inline-block relative top-[1px] left-[-1px] font-bold text-base"></span>
                    </span>
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  sideOffset={14}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <DropdownMenuItem asChild>
                    <NavLink
                      to={`/resources/1${item.searchParams}`}
                      target="_blank"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(`/resources/1${item.searchParams}`);
                        console.log('open', e);
                      }}
                    >
                      <span className="i-ant-design:link-outlined mr1"></span>
                      <span>在新页面中打开</span>
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => copyRSS()}>
                    <span className="i-carbon-rss mr1"></span>
                    <span>复制 RSS 订阅链接</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => startRename()}>
                    <span className="i-ant-design:edit-outlined mr1"></span>
                    <span>重命名</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="hover:(text-red-500! bg-red-100!)"
                    onClick={() => deleteItem()}
                  >
                    <span className="i-carbon-trash-can mr1"></span>
                    <span>删除</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={20} align="start" alignOffset={-10}>
            <div>
              {/* <div className='font-bold pb2 mb2 border-b'>搜索条件</div> */}
              <div className="space-y-1 py-1 text-sm">
                {item.name && (
                  <div>
                    <span className="font-bold mr2 select-none">条件别名</span>
                    <span className={`select-text text-base-600`}>{item.name}</span>
                  </div>
                )}
                {display.type && (
                  <div>
                    <span className="font-bold mr2 select-none">类型</span>
                    <span className={`select-text text-base-600 ${display.type.color}`}>
                      {display.type.name}
                    </span>
                  </div>
                )}
                {display.search.length > 0 && (
                  <div>
                    <span className="font-bold mr2 select-none">标题搜索</span>
                    {display.search.map((text, idx) => (
                      <span key={text}>
                        {idx > 0 && <span className="">|</span>}
                        <span className="">{text}</span>
                      </span>
                    ))}
                  </div>
                )}
                {display.include.length > 0 && (
                  <div>
                    <span className="font-bold mr2 select-none">标题匹配</span>
                    {display.include.map((text, idx) => (
                      <span key={text}>
                        {idx > 0 && <span className="ml2 mr2 text-base-400 select-none">|</span>}
                        <span className="">{text}</span>
                      </span>
                    ))}
                  </div>
                )}
                {display.keywords.length > 0 && (
                  <div>
                    <span className="font-bold mr2 select-none">包含关键词</span>
                    {display.keywords.map((text, idx) => (
                      <span key={text}>
                        {idx > 0 && <span className="ml2 mr2 text-base-400 select-none">&</span>}
                        <span className="">{text}</span>
                      </span>
                    ))}
                  </div>
                )}
                {display.exclude.length > 0 && (
                  <div>
                    <span className="font-bold mr2 select-none">排除关键词</span>
                    {display.exclude.map((text) => (
                      <span key={text}>{text}</span>
                    ))}
                  </div>
                )}
                {display.fansubs && display.fansubs.length > 0 && (
                  <div>
                    <span className="font-bold mr2 select-none">字幕组</span>
                    {display.fansubs.map((fansub) => (
                      <a
                        key={`${fansub.provider}:${fansub.providerId}`}
                        href={`/resources/1?fansubId=${fansub.providerId}`}
                        className="select-text text-link mr2"
                      >
                        {fansub.name}
                      </a>
                    ))}
                  </div>
                )}
                {display.after && (
                  <div>
                    <span className="font-bold mr2 select-none">搜索开始于</span>
                    <span className="select-text">
                      {safeFormat(display.after, 'yyyy 年 M 月 d 日 hh:mm')}
                    </span>
                  </div>
                )}
                {display.before && (
                  <div>
                    <span className="font-bold mr2 select-none">搜索结束于</span>
                    <span className="select-text">
                      {safeFormat(display.before, 'yyyy 年 M 月 d 日 hh:mm')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

function inferCollectionItemName(item: CollectionItem) {
  let title;
  if (item.search) {
    title = item.search.join(' ');
  }
  if (item.include) {
    title = item.include.join(' ');
  }
  if (title) {
    const fansubId = item.fansubId;
    const fansubs = fansubId
      ? fansubId.map((id) => {
          const provider = 'dmhy';
          const fs = findFansub(provider, id);
          return fs ? fs : { provider, providerId: id, name: id };
        })
      : undefined;

    return { title, fansubs };
  }

  return {
    text: stringifySearch(new URLSearchParams(item.searchParams))
  };
}
