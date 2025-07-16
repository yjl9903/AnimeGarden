import { toast } from 'sonner';
import { Link, NavLink } from '@remix-run/react';
import { useCallback } from 'react';
import { useAtom, useSetAtom } from 'jotai';

import type { FullBangumi } from 'bgmd/types';
import { stringifyURLSearch, type Jsonify, type ResolvedFilterOptions } from '@animegarden/client';

import { getSubjectById } from '~/utils/subjects';
import {
  removeQuote,
  formatChinaTime,
  DisplayTypeColor,
  trackAddCollection,
  trackCopyFeed
} from '~/utils';
import { Button } from '~/components/ui/button';
import { SearchTooltip } from '~/components/Help';
import { isOpenSidebar } from '~/layouts/Sidebar/atom';
import { addCollectionItemAtom, currentCollectionAtom } from '~/states/collection';

export type DisplayResolvedFilterOptions = ReturnType<typeof resolveFilterOptions>;

export function resolveFilterOptions(
  filter: Omit<Jsonify<ResolvedFilterOptions>, 'page' | 'pageSize'>
) {
  const types = [...new Set(filter.types ?? [])];
  const publishers = [...new Set(filter.publishers ?? [])];
  const fansubs = [...new Set(filter.fansubs ?? [])];

  return {
    types: types.length > 0 ? types : undefined,
    subjects: filter.subjects ?? [],
    publishers: publishers.length > 0 ? publishers : undefined,
    fansubs: fansubs.length > 0 ? fansubs : undefined,
    before: filter.before ? new Date(filter.before) : undefined,
    after: filter.after ? new Date(filter.after) : undefined,
    search: filter.search ? removeQuote(filter.search) : undefined,
    include: filter.include ?? undefined,
    keywords: filter.keywords ?? undefined,
    exclude: filter.exclude ?? undefined
  };
}

interface Props {
  filter?: Omit<Jsonify<ResolvedFilterOptions>, 'page' | 'pageSize'>;

  subject?: Omit<FullBangumi, 'summary'>;

  feedURL?: string;
}

export function Filter(props: Props) {
  const { filter, feedURL } = props;

  const [collection, setCollection] = useAtom(currentCollectionAtom);
  const setIsOpen = useSetAtom(isOpenSidebar);

  const resolved = filter ? resolveFilterOptions(filter) : ({} as ResolvedFilterOptions);
  const {
    types = [],
    fansubs = [],
    publishers = [],
    subjects = [],
    after,
    before,
    search = [],
    include = [],
    keywords = [],
    exclude = []
  } = resolved;

  const copyRSS = useCallback(
    async (_e: React.MouseEvent) => {
      try {
        if (!feedURL) throw new Error(`RSS URL is empty`);
        await navigator.clipboard.writeText(feedURL);
        toast.success('复制 RSS 订阅成功', {
          dismissible: true,
          duration: 3000,
          closeButton: true
        });
      } catch (error) {
        console.error(error);
        toast.error('复制 RSS 订阅失败', { closeButton: true });
      }

      trackCopyFeed();
    },
    [feedURL]
  );

  const addCollectionItem = useSetAtom(addCollectionItemAtom);
  const addToCollection = useCallback(() => {
    if (!filter) return;
    if (!collection) return;

    const realFilter = {
      ...resolved,
      subjects: props.subject ? [props.subject.id] : resolved.subjects
    };
    const searchParams = '?' + stringifyURLSearch(realFilter).toString();

    if (!collection.filters.find((i) => i.searchParams === searchParams)) {
      addCollectionItem(collection, { ...realFilter, name: '', searchParams });

      toast.success(`成功添加到 ${collection.name}`, {
        dismissible: true,
        duration: 3000,
        closeButton: true,
        position: 'top-right'
      });
    } else {
      toast.warning(`已添加到 ${collection.name}`, {
        dismissible: true,
        duration: 3000,
        closeButton: true,
        position: 'top-right'
      });
    }
    setIsOpen(true);

    trackAddCollection();
  }, [filter, collection, setCollection]);

  if (!filter) return;

  if (
    !(
      types.length > 0 ||
      subjects.length > 0 ||
      fansubs.length > 0 ||
      publishers.length > 0 ||
      search.length > 0 ||
      include.length > 0 ||
      keywords.length > 0 ||
      before ||
      after
    )
  ) {
    return;
  }

  const realSubjects =
    subjects.length === 1 && props.subject
      ? [props.subject]
      : subjects.map((sub) => getSubjectById(sub)).filter(Boolean);

  return (
    <div className="mb4 p4 w-full bg-gray-100 rounded-md space-y-2">
      {realSubjects.length > 0 && (
        <div className="space-x-2 text-0">
          <span className="text-4 text-base-800 font-bold mr2 select-none keyword">动画</span>
          {realSubjects.map((subject) => (
            <span key={subject.id} className={`text-4 select-text text-base-900 text-link`}>
              <Link to={`/subject/${subject.id}/1`}>{subject.bangumi?.name_cn}</Link>
            </span>
          ))}
        </div>
      )}
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
              key={publisher}
              to={`/resources/1?publisher=${publisher}`}
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
              key={fansub}
              to={`/resources/1?fansub=${fansub}`}
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
          <span className="text-4 select-text">
            {formatChinaTime(after, 'yyyy 年 M 月 d 日 hh:mm')}
          </span>
        </div>
      )}
      {before && (
        <div className="space-x-2 select-none text-0">
          <span className="text-4 text-base-800 font-bold mr2 keyword">搜索结束于</span>
          <span className="text-4 select-text">
            {formatChinaTime(before, 'yyyy 年 M 月 d 日 hh:mm')}
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
            <span key={idx}>
              {idx > 0 && <span className="text-base-400 text-4 select-none">|</span>}
              {/* prettier-ignore */}
              <span className="text-4 select-text underline underline-dotted underline-gray-500">{i}</span>
            </span>
          ))}
        </div>
      )}
      {search.length === 0 && keywords.length > 0 && (
        <div className="space-x-2 select-none text-0">
          <span className="text-4 text-base-800 font-bold mr2 keyword">包含关键词</span>
          {keywords.map((i, idx) => (
            <span key={i}>
              {idx > 0 && <span className="text-base-400 text-4 select-none mr2">&</span>}
              {/* prettier-ignore */}
              <span className="text-4 select-text underline underline-dotted underline-gray-500">{i}</span>
            </span>
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
      {(search.length !== 0 ||
        include.length !== 0 ||
        keywords.length !== 0 ||
        realSubjects.length !== 0) && (
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
