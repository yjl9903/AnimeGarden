import { APP_HOST } from '~build/meta';
import { navigate } from 'astro:transitions/client';

import { format } from 'date-fns';
import { stringifySearchURL, type ResolvedFilterOptions } from 'animegarden';

import {
  useFloating,
  offset,
  flip,
  shift,
  useDismiss,
  useRole,
  useClick,
  useInteractions,
  FloatingFocusManager,
  useId,
  type FloatingContext,
  type ReferenceType,
  type ElementProps,
  type Placement
} from '@floating-ui/react';

import { toast } from 'sonner';
import { useState, memo, useCallback, useMemo } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import {
  Book,
  Cloud,
  ExternalLink,
  HelpCircle,
  PlusIcon,
  Star,
  X,
  Trash,
  Copy,
  Rss
} from 'lucide-react';
import { useAutoAnimate } from '@formkit/auto-animate/react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  collectionsAtom,
  currentCollectionAtom,
  currentCollectionNameAtom,
  openCollectionAtom
} from '@/state';
import { generateFeed } from '@/logic/feed';
import { Button } from '@/components/ui/button';
import { resolveFilterOptions } from '@/logic/filter';
import { triggerRssEvent, triggerCollectionEvent } from '@/clarity';

import { ScrollArea } from './ui/scroll-area';
import { useDraggable } from './hooks/draggable';

export function Menu() {
  return (
    <Popover>
      <Dropdown></Dropdown>
    </Popover>
  );
}

function Dropdown() {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useAtom(collectionsAtom);
  const [curCollectionName, setCurCollectionName] = useAtom(currentCollectionNameAtom);
  const setOpenCollection = useSetAtom(openCollectionAtom);

  const openCollection = (name: string) => {
    triggerCollectionEvent('open');
    setCurCollectionName(name);
    setOpenCollection((value) => !value);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shadow-sm bg-light-100 hover:bg-light-400 hover:bg-op-100 h-12! w-12!"
        >
          <PlusIcon className="h-8 w-8" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent forceMount className="w-56" collisionPadding={8}>
        <DropdownMenuLabel className="font-quicksand font-bold select-none">
          Anime Garden
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {collections.map((collection) => (
            <DropdownMenuItem
              key={collection.name}
              onSelect={() => openCollection(collection.name)}
            >
              <Star className="mr-2 h-4 w-4"></Star>
              <span>{collection.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => window.open(`https://github.com/yjl9903/AnimeGarden`)}>
          <span className="i-devicon-github mr-2 h-4 w-4" />
          <span>GitHub</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            window.open(
              `https://github.com/yjl9903/AnimeGarden/issues/new?assignees=&labels=bug&projects=&template=bug_report.yml`
            )
          }
        >
          <HelpCircle className="mr-2 h-4 w-4" />
          <span>问题反馈</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate(`/docs/api`)}>
          <Cloud className="mr-2 h-4 w-4" />
          <span>API 文档</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate(`/docs/api`)} disabled>
          <Book className="mr-2 h-4 w-4" />
          <span>帮助</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => window.open(`https://share.dmhy.org/`)}>
          <ExternalLink className="mr-2 h-4 w-4" />
          <span>动漫花园</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Popover(props: { children: React.ReactNode }) {
  const { children } = props;

  const [isOpen, setIsOpen] = useAtom(openCollectionAtom);
  const initialPlacement: Placement = 'top-start';

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: (open) => {
      setIsOpen(open);
    },
    strategy: 'fixed',
    placement: initialPlacement,
    middleware: [offset(10), shift({ mainAxis: true, crossAxis: true })]
  });
  const closePopover = () => {
    setIsOpen(false);
  };

  // const click = useClick(context);
  // const dismiss = useDismiss(context);
  // const role = useRole(context);
  const draggable = useDraggable(context, initialPlacement, (target) => {
    return !target.classList.contains('draggable');
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    // click,
    // dismiss,
    // role,
    draggable
  ]);

  const headingId = useId();
  const currentCollections = useAtomValue(currentCollectionNameAtom);

  return (
    <>
      <div ref={refs.setReference} {...getReferenceProps()}>
        {children}
      </div>
      {isOpen && (
        <FloatingFocusManager context={context} modal={false} closeOnFocusOut={false}>
          <div
            className="popover border shadow-lg rounded-md bg-white"
            ref={refs.setFloating}
            style={floatingStyles}
            aria-labelledby={headingId}
            {...getFloatingProps()}
          >
            <div
              id={headingId}
              className="draggable px4 py2 border-b flex items-center cursor-move"
            >
              <span className="draggable text-base font-bold select-none">
                {currentCollections}
              </span>
              <span className="draggable flex-auto"></span>
              <Button
                variant="link"
                size="icon"
                className="draggable bg-light-100 hover:bg-light-400 hover:bg-op-100 h-6 w-6"
                onClick={closePopover}
              >
                <X className="h-4 w-4 text-red" />
              </Button>
            </div>
            <div className="w-[40vw]">
              <CollectionManager></CollectionManager>
            </div>
          </div>
        </FloatingFocusManager>
      )}
    </>
  );
}

const safeFormat: typeof format = (...args) => {
  try {
    return format(...args);
  } catch (error) {
    console.log(error);
    return '';
  }
};

const CollectionItem = memo((props: { filter: ResolvedFilterOptions; searchParams: string }) => {
  const { filter, searchParams } = props;
  const display = useMemo(() => resolveFilterOptions(filter), [filter]);

  const rssURL = useMemo(() => generateRSS([filter]), [filter]);

  const [currentCollection, setCurrentCollection] = useAtom(currentCollectionAtom);
  const removeSelf = useCallback(() => {
    setCurrentCollection({
      ...currentCollection,
      items: currentCollection.items.filter((i) => i.searchParams !== searchParams)
    });
  }, [searchParams, currentCollection]);

  const copySelf = useCallback(() => {
    copyRSS([filter]);
  }, [filter]);

  return (
    <div className="w-full border-b pb4 mb4">
      <div className="space-y-1 text-sm">
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
                <span className="font-bold">{text}</span>
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
      <div className="mt-2 flex gap-2">
        <Button variant="outline" size="icon" className="hover:bg-gray-100" asChild>
          <a href={`/resources/1${searchParams}`}>
            <ExternalLink className="h-4 w-4"></ExternalLink>
          </a>
        </Button>
        <Button variant="outline" size="icon" className="hover:bg-gray-100" asChild>
          <a href={rssURL} target="_blank">
            <Rss className="h-4 w-4"></Rss>
          </a>
        </Button>
        <Button variant="outline" size="icon" className="hover:bg-gray-100" onClick={copySelf}>
          <Copy className="h-4 w-4"></Copy>
        </Button>
        <Button variant="destructive" size="icon" onClick={removeSelf}>
          <Trash className="h-4 w-4"></Trash>
        </Button>
      </div>
    </div>
  );
});

function CollectionManager() {
  const [currentCollection, setCurrentCollection] = useAtom(currentCollectionAtom);

  const collectionRSS = useMemo(() => generateRSS(currentCollection.items), [currentCollection]);
  const copyCollectionRSS = useCallback(() => {
    copyRSS(currentCollection.items);
  }, [currentCollection]);

  const [parent] = useAutoAnimate();

  return (
    <>
      <ScrollArea className="px4 py2 h-[360px]">
        <div ref={parent}>
          {currentCollection.items.map((item) => (
            <CollectionItem
              key={item.searchParams}
              filter={item}
              searchParams={item.searchParams}
            ></CollectionItem>
          ))}
        </div>
        {currentCollection.items.length === 0 && (
          <div className="space-y-2">
            <div>{currentCollection.name}没有记录</div>
            <div>
              可以使用<span className="font-bold"> 搜索框 </span>和
              <span className="font-bold"> 类型、字幕组 </span>
              筛选搜索结果
            </div>
          </div>
        )}
      </ScrollArea>
      <div className="px4 pt4 pb4 border-t flex items-center gap-4">
        <Button onClick={copyCollectionRSS} disabled={currentCollection.items.length === 0}>
          复制 RSS 订阅链接
        </Button>
        {currentCollection.items.length > 0 && (
          <Button variant="outline" className="hover:bg-gray-100" asChild>
            <a href={collectionRSS} target="_blank">
              <Rss className="h-4 w-4"></Rss>
            </a>
          </Button>
        )}
      </div>
    </>
  );
}

function generateRSS(filters: ResolvedFilterOptions[]) {
  const searchs = filters.map((filter) => stringifySearchURL(location.origin, filter).searchParams);
  const filter = generateFeed(...searchs);
  return `/feed.xml?filter=${encodeURI(filter)}`;
}

async function copyRSS(filters: ResolvedFilterOptions[]) {
  if (filters.length === 0) {
    toast.error('没有选择任何搜索条件', { closeButton: true });
    return;
  }

  try {
    const url = `${APP_HOST}${generateRSS(filters)}`;
    await navigator.clipboard.writeText(url);
    toast.success('复制 RSS 订阅成功', { dismissible: true, duration: 3000, closeButton: true });
    triggerRssEvent('copy');
  } catch (error) {
    console.error(error);
    toast.error('复制 RSS 订阅失败', { closeButton: true });
  }
}
