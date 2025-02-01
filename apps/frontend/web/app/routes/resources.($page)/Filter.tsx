import { toast } from 'sonner';
import { format } from 'date-fns';
import { NavLink, useLocation } from '@remix-run/react';
import { useCallback } from 'react';
import { useAtom, useSetAtom } from 'jotai';

import type { ResolvedFilterOptions } from '@animegarden/client';

import { APP_HOST } from '~build/env';

import { removeQuote, DisplayTypeColor } from '~/utils';
import { Button } from '~/components/ui/button';
import { SearchTooltip } from '~/components/Help';
import { isOpenSidebar } from '~/layouts/Sidebar/atom';
import { currentCollectionAtom } from '~/states/collection';

export type DisplayResolvedFilterOptions = ReturnType<typeof resolveFilterOptions>;

export function resolveFilterOptions(filter: Omit<ResolvedFilterOptions, 'page' | 'pageSize'>) {
  const types = [...new Set(filter.types ?? [])];
  const publishers = [...new Set(filter.publishers ?? [])];
  const fansubs = [...new Set(filter.fansubs ?? [])];

  return {
    types,
    publishers,
    fansubs,
    before: filter.before ? new Date(filter.before) : undefined,
    after: filter.after ? new Date(filter.after) : undefined,
    search: filter.search ? removeQuote(filter.search) : [],
    include: filter.include ?? [],
    keywords: filter.keywords ?? [],
    exclude: filter.exclude ?? []
  };
}

interface Props {
  filter?: Omit<ResolvedFilterOptions, 'page' | 'pageSize'>;

  feedURL?: string;
}

const safeFormat: typeof format = (...args) => {
  try {
    return format(...args);
  } catch (error) {
    console.log(error);
    return '';
  }
};

export function Filter(props: Props) {
  const { filter, feedURL } = props;

  const location = useLocation();
  const [collection, setCollection] = useAtom(currentCollectionAtom);
  const setIsOpen = useSetAtom(isOpenSidebar);

  const copyRSS = useCallback(
    async (e: React.MouseEvent) => {
      try {
        if (!feedURL) throw new Error(`RSS URL is empty`);
        const query = encodeURI(feedURL.slice(`/feed.xml?filter=`.length));
        await navigator.clipboard.writeText(`https://${APP_HOST}/feed.xml?filter=${query}`);
        toast.success('复制 RSS 订阅成功', {
          dismissible: true,
          duration: 3000,
          closeButton: true
        });
      } catch (error) {
        console.error(error);
        toast.error('复制 RSS 订阅失败', { closeButton: true });
      }
    },
    [feedURL]
  );
  const addToCollection = useCallback(() => {
    if (!filter) return;
    if (!collection.items.find((i) => i.searchParams === location.search)) {
      setCollection({
        name: collection.name,
        items: [{ ...filter, name: '', searchParams: location.search }, ...collection.items]
      });

      toast.success(`成功添加到 ${collection.name}`, {
        dismissible: true,
        duration: 3000,
        closeButton: true
      });
    } else {
      toast.warning(`已添加到 ${collection.name}`, {
        dismissible: true,
        duration: 3000,
        closeButton: true
      });
    }
    setIsOpen(true);
  }, [filter, collection, setCollection]);

  if (!filter) return;

  const { types, fansubs, publishers, after, before, search, include, keywords, exclude } =
    resolveFilterOptions(filter);

  if (
    !(
      fansubs.length > 0 ||
      publishers.length > 0 ||
      types.length > 0 ||
      search.length > 0 ||
      include.length > 0 ||
      keywords.length > 0 ||
      before ||
      after
    )
  ) {
    return;
  }

  return (
    <div className="mb4 p4 w-full bg-gray-100 rounded-md space-y-2">
      {types.length > 0 && (
        <div className="space-x-2 text-0">
          <span className="text-4 text-base-800 font-bold mr2 select-none keyword">类型</span>
          {types.map((type) => (
            <span
              key={type}
              className={`text-4 select-text text-base-600 ${DisplayTypeColor[type]}`}
            >
              {type}
            </span>
          ))}
        </div>
      )}
      {publishers.length > 0 && (
        <div className="space-x-2 text-0">
          <span className="text-4 text-base-800 font-bold mr2 select-none keyword">发布者</span>
          {publishers.map((publisher) => (
            <NavLink
              to={`/resources/1?publisher=${publisher}`}
              key={publisher}
              className="text-4 select-text text-link"
            >
              {publisher}
            </NavLink>
          ))}
        </div>
      )}
      {fansubs.length > 0 && (
        <div className="space-x-2 text-0">
          <span className="text-4 text-base-800 font-bold mr2 select-none keyword">字幕组</span>
          {fansubs.map((fansub) => (
            <NavLink
              to={`/resources/1?fansub=${fansub}`}
              key={fansub}
              className="text-4 select-text text-link"
            >
              {fansub}
            </NavLink>
          ))}
        </div>
      )}
      {after && (
        <div className="space-x-2 select-none text-0">
          <span className="text-4 text-base-800 font-bold mr2 keyword">搜索开始于</span>
          <span className="text-4 select-text">{safeFormat(after, 'yyyy 年 M 月 d 日 hh:mm')}</span>
        </div>
      )}
      {before && (
        <div className="space-x-2 select-none text-0">
          <span className="text-4 text-base-800 font-bold mr2 keyword">搜索结束于</span>
          <span className="text-4 select-text">
            {safeFormat(before, 'yyyy 年 M 月 d 日 hh:mm')}
          </span>
        </div>
      )}
      {search.length > 0 && (
        <div className="space-x-2 text-0">
          {/* prettier-ignore */}
          <span className="text-4 select-none text-base-800 font-bold mr2 keyword">标题搜索</span>
          {search.map((i) => (
            <span
              key={i}
              className="text-4 select-text underline underline-dotted underline-gray-500"
            >
              {i}
            </span>
          ))}
        </div>
      )}
      {search.length === 0 && include.length > 0 && (
        <div className="space-x-2 text-0">
          {/* prettier-ignore */}
          <span className="text-4 select-none text-base-800 font-bold mr2 keyword">标题匹配</span>
          {include.map((i, idx) => (
            <>
              {idx > 0 && <span className="text-base-400 text-4 select-none">|</span>}
              {/* prettier-ignore */}
              <span key={i} className="text-4 select-text underline underline-dotted underline-gray-500">{i}</span>
            </>
          ))}
        </div>
      )}
      {search.length === 0 && keywords.length > 0 && (
        <div className="space-x-2 select-none text-0">
          <span className="text-4 text-base-800 font-bold mr2 keyword">包含关键词</span>
          {keywords.map((i, idx) => (
            <>
              {idx > 0 && <span className="text-base-400 text-4 select-none">&</span>}
              {/* prettier-ignore */}
              <span key={i} className="text-4 select-text underline underline-dotted underline-gray-500">{i}</span>
            </>
          ))}
        </div>
      )}
      {search.length === 0 && exclude.length > 0 && (
        <div className="space-x-2 text-0">
          {/* prettier-ignore */}
          <span className="text-4 select-none text-base-800 font-bold mr2 inline-block">排除关键词</span>
          {exclude.map((i) => (
            <span key={i} className="text-4 select-text">
              {i}
            </span>
          ))}
        </div>
      )}
      {(search.length !== 0 || include.length !== 0 || keywords.length !== 0) && (
        <div className="flex items-center gap4 pt-4">
          <Button
            variant="outline"
            size="sm"
            className="add-collection"
            onClick={() => addToCollection()}
          >
            <span className="i-carbon:bookmark mr1"></span>
            <span>添加到收藏夹</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="copy-rss"
            data-rss={feedURL}
            onClick={(e) => copyRSS(e)}
          >
            <span className="i-carbon-rss mr1"></span>
            <span>复制 RSS 订阅链接</span>
          </Button>
          <SearchTooltip />
        </div>
      )}
    </div>
  );
}
