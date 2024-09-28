import { format } from 'date-fns';

import { findFansub, type ResolvedFilterOptions, type ResourceType } from 'animegarden';

import { removeQuote } from '@/utils';
import { DisplayType, DisplayTypeColor, QueryType } from '@/constant';
import { NavLink } from '@remix-run/react';

export type DisplayResolvedFilterOptions = ReturnType<typeof resolveFilterOptions>;

export function resolveFilterOptions(filter: Omit<ResolvedFilterOptions, 'page'>) {
  const fansubId = filter.fansubId;
  const fansubs = fansubId
    ? fansubId.map((id) => {
        const provider = 'dmhy';
        const fs = findFansub(provider, id);
        return fs ? fs : { provider, providerId: id, name: id };
      })
    : undefined;

  const rawType = (
    filter.type && filter.type in QueryType ? QueryType[filter.type] : filter.type
  ) as ResourceType | undefined;
  const type = rawType && rawType in DisplayType ? DisplayType[rawType] : (rawType ?? '動畫');

  return {
    publisher: filter.publisherId,
    fansubs,
    type: rawType
      ? {
          name: type,
          color: DisplayTypeColor[type as ResourceType] ?? DisplayTypeColor[rawType]
        }
      : undefined,
    before: filter.before ? new Date(filter.before) : undefined,
    after: filter.after ? new Date(filter.after) : undefined,
    search: filter.search ? removeQuote(filter.search) : [],
    include: filter.include ?? [],
    keywords: filter.keywords ?? [],
    exclude: filter.exclude ?? []
  };
}

interface Props {
  filter?: Omit<ResolvedFilterOptions, 'page'>;
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
  const { filter } = props;

  if (!filter) return;

  const { type, fansubs, after, before, search, include, keywords, exclude } =
    resolveFilterOptions(filter);

  if (!(type || search.length > 0 || include.length > 0 || before || after || fansubs)) return;

  return (
    <div className="mb4 p4 w-full bg-gray-100 rounded-md space-y-2">
      {type && (
        <div className="space-x-2 text-0">
          <span className="text-4 text-base-800 font-bold mr2 select-none keyword">类型</span>
          <span className={`text-4 select-text text-base-600 ${type.color}`}>{type.name}</span>
        </div>
      )}
      {fansubs && (
        <div className="space-x-2 text-0">
          <span className="text-4 text-base-800 font-bold mr2 select-none keyword">字幕组</span>
          {fansubs.map((fansub) => (
            <NavLink
              to={`/resources/1?fansubId=${fansub.providerId}`}
              className="text-4 select-text text-link"
            >
              {fansub.name}
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
      {/* {
    (search.length !== 0 || include.length !== 0 || keywords.length !== 0) && (
      <div className="flex items-center gap4 pt-4">
        <Button client:load variant="default" size="sm" className="copy-rss" data-rss={feedURL}>
          复制 RSS 订阅链接
        </Button>
        <Button client:load size="sm" className="add-collection">
          添加到收藏夹
        </Button>
        <SearchTooltip />
      </div>
    )
  } */}
    </div>
  );
}
