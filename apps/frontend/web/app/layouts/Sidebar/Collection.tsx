import clsx from 'clsx';
import { toast } from 'sonner';
import { NavLink, useLocation } from '@remix-run/react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { memo, useCallback, useMemo, useRef, useState } from 'react';

import type { Collection } from '@animegarden/client';

import { APP_HOST } from '~build/env';

import { DisplayTypeColor, formatChinaTime } from '~/utils';
import {
  collectionsAtom,
  deleteCollectionItemAtom,
  updateCollectionItemAtom
} from '~/states/collection';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { resolveFilterOptions } from '~/routes/resources.($page)/Filter';

import { stringifySearch } from '../Search/utils';
import { getSubjectById } from '@/utils/subjects';

type CollectionItem = Collection<true>['filters'][0];

export const CollectionItemContent = memo(
  (props: { collection: Collection; item: CollectionItem; active: boolean }) => {
    const { collection, item, active } = props;

    const name = inferCollectionItemName(props.item);

    const fansub = name.fansubs?.join(' ');
    const title = item.name
      ? item.name
      : name.title
        ? name.title + (fansub ? ' 字幕组:' + fansub : '')
        : name.text!;

    const [collections, setCollections] = useAtom(collectionsAtom);
    const updateCollectionItem = useSetAtom(updateCollectionItemAtom);
    const deleteCollectionItem = useSetAtom(deleteCollectionItemAtom);

    // --- Open state
    const [tipOpen, setTipOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const copyRSS = useCallback(async () => {
      try {
        const url = `https://${APP_HOST}/feed.xml${item.searchParams}`;
        await navigator.clipboard.writeText(url);
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

      updateCollectionItem(collection, { ...item, name: newTitle });
      setEditable(false);
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
                    onClick={() => deleteCollectionItem(collection, item)}
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
              <CollectionItemFilter item={item} />
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

const CollectionItemFilter = memo((props: { item: CollectionItem }) => {
  const display = props.item;

  const subjects = display?.subjects?.map((id) => getSubjectById(id)).filter(Boolean);

  return (
    <div className="space-y-1 py-1 text-sm">
      {display.name && (
        <div>
          <span className="font-bold mr2 select-none">条件别名</span>
          <span className={`select-text text-base-600`}>{display.name}</span>
        </div>
      )}
      {subjects && subjects.length > 0 && (
        <div>
          <span className="font-bold mr2 select-none">动画</span>
          {subjects.map((subject) => (
            <span key={subject.id} className={``}>
              {subject.bangumi?.name_cn || subject.name}
              {/* (Bangumi: {subject.id}) */}
            </span>
          ))}
        </div>
      )}
      {display.types && display.types.length > 0 && (
        <div>
          <span className="font-bold mr2 select-none">类型</span>
          {display.types.map((type) => (
            <span key={type} className={`select-text text-base-600 ${DisplayTypeColor[type]}`}>
              {type}
            </span>
          ))}
        </div>
      )}
      {display.search && display.search.length > 0 && (
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
      {display.include && display.include.length > 0 && (
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
      {display.keywords && display.keywords.length > 0 && (
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
      {display.exclude && display.exclude.length > 0 && (
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
              key={fansub}
              href={`/resources/1?fansub=${fansub}`}
              className="select-text text-link mr2"
            >
              {fansub}
            </a>
          ))}
        </div>
      )}
      {display.after && (
        <div>
          <span className="font-bold mr2 select-none">搜索开始于</span>
          <span className="select-text">
            {formatChinaTime(display.after, 'yyyy 年 M 月 d 日 hh:mm')}
          </span>
        </div>
      )}
      {display.before && (
        <div>
          <span className="font-bold mr2 select-none">搜索结束于</span>
          <span className="select-text">
            {formatChinaTime(display.before, 'yyyy 年 M 月 d 日 hh:mm')}
          </span>
        </div>
      )}
    </div>
  );
});

function inferCollectionItemName(item: CollectionItem) {
  let title;

  if (item.search && item.search.length > 0) {
    title = item.search.join(' ');
  } else if (item.include && item.include.length > 0) {
    title = item.include.join(' ');
  } else if (item.keywords && item.keywords.length > 0) {
    title = item.keywords.join(' ');
  } else if (item.subjects && item.subjects.length === 1) {
    const bgm = getSubjectById(item.subjects[0]);
    if (bgm) {
      title = bgm.bangumi?.name_cn || bgm.name;
    }
  }

  if (title) {
    const fansubs = item.fansubs;
    return { title, fansubs };
  }

  return {
    text: stringifySearch(new URLSearchParams(item.searchParams))
  };
}
