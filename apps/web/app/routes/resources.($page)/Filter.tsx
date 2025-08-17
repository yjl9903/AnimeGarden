import { toast } from 'sonner';
import { NavLink } from '@remix-run/react';
import { useCallback } from 'react';
import { useAtom, useSetAtom } from 'jotai';

import type { FullBangumi } from 'bgmd/types';

import {
  type PresetOptions,
  type Jsonify,
  type ResolvedFilterOptions,
  type Resource,
  stringifyURLSearch
} from '@animegarden/client';

import {
  generateCurlCode,
  generateJavaScriptCode,
  generatePythonCode,
  generateIframeCode
} from '~/utils/code-generator';
import {
  removeQuote,
  formatChinaTime,
  DisplayTypeColor,
  trackAddCollection,
  trackCopyFeed,
  PRESET_DISPLAY_NAME,
  trackCopyMagnetLinks,
  trackCopyJSONData,
  trackCopyFetchCurl,
  trackCopyFetchJS,
  trackCopyFetchPython,
  trackCopyIframe
} from '~/utils';
import { getSubjectById, getSubjectDisplayName, getSubjectURL } from '~/utils/subjects';
import { Button } from '~/components/ui/button';
import { SearchTooltip } from '~/components/Help';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu';
import { isOpenSidebar } from '~/layouts/Sidebar/atom';
import { addCollectionItemAtom, currentCollectionAtom } from '~/states/collection';

export type DisplayResolvedFilterOptions = ReturnType<typeof resolveFilterOptions>;

export function resolveFilterOptions(
  filter: Jsonify<ResolvedFilterOptions> | ResolvedFilterOptions
) {
  const types = [...new Set(filter.types ?? [])];
  const publishers = [...new Set(filter.publishers ?? [])];
  const fansubs = [...new Set(filter.fansubs ?? [])];

  return {
    preset: filter.preset ?? undefined,
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
  filter?: Jsonify<ResolvedFilterOptions & PresetOptions>;

  subject?: Omit<FullBangumi, 'summary'>;

  feedURL?: string;

  resources?: Jsonify<Resource<{ tracker: true }>>[];

  complete?: boolean;
}

export function FilterCard(props: Props) {
  const { filter } = props;

  const resolved = filter ? resolveFilterOptions(filter) : ({} as ResolvedFilterOptions);

  const {
    preset,
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
    <div className="mb4 p-4 lt-sm:px-3 w-full bg-zinc-50 dark:bg-zinc-800 drop-shadow rounded-md space-y-2">
      {preset && (
        <div className="space-x-2 text-0">
          <span className="text-4 text-base-800 font-bold mr2 select-none keyword">预设</span>
          <span className="text-4 select-text">{PRESET_DISPLAY_NAME[preset]}</span>
        </div>
      )}
      {realSubjects.length > 0 && (
        <div className="space-x-2 text-0">
          <span className="text-4 text-base-800 font-bold mr2 select-none keyword">动画</span>
          {realSubjects.map((subject) => (
            <span key={subject.id} className={`text-4 select-text text-base-900 text-link`}>
              <NavLink to={getSubjectURL(subject)}>{getSubjectDisplayName(subject)}</NavLink>
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
              {idx > 0 && <span className="text-base-400 text-4 select-none mr2">|</span>}
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
        realSubjects.length !== 0) && <FilterOperations {...props} />}
    </div>
  );
}

const useToastCallback = (
  fn: () => Promise<void>,
  options: {
    success: string;
    error: string;
    onSuccess?: () => void;
    onError?: () => void;
    onFinally?: () => void;
  },
  deps: React.DependencyList
) => {
  return useCallback(async () => {
    try {
      await fn();
      options.onSuccess?.();
      toast.success(options.success, {
        dismissible: true,
        duration: 3000,
        closeButton: true,
        position: 'top-right'
      });
    } catch (error) {
      console.error(error);
      options.onError?.();
      toast.error(options.error, {
        dismissible: true,
        duration: 3000,
        closeButton: true,
        position: 'top-right'
      });
    } finally {
      options.onFinally?.();
    }
  }, deps);
};

const CopyResourcesDropdown = (props: Props) => {
  const { filter, resources = [], feedURL } = props;

  const copyRSS = useToastCallback(
    async () => {
      if (!feedURL) throw new Error(`RSS URL is empty`);
      await navigator.clipboard.writeText(feedURL);
    },
    {
      success: '复制 RSS 订阅成功',
      error: '复制 RSS 订阅失败',
      onFinally: () => trackCopyFeed()
    },
    [feedURL]
  );

  const copyAllMagnetLinks = useToastCallback(
    async () => {
      const magnetLinks =
        resources.map((resource) => resource.magnet + (resource.tracker ?? '')) ?? [];
      const text = magnetLinks.join('\n');
      if (text.length === 0 || resources.length === 0) {
        throw new Error('没有磁力链接');
      }
      await navigator.clipboard.writeText(text);
    },
    {
      success: `成功复制 ${resources.length} 条磁力链接`,
      error: '没有磁力链接',
      onFinally: () => trackCopyMagnetLinks()
    },
    [resources]
  );

  const copyJSONData = useToastCallback(
    async () => {
      const json = JSON.stringify({ filter, resources }, null, 2);
      await navigator.clipboard.writeText(json);
    },
    {
      success: '复制 JSON 数据成功',
      error: '复制 JSON 数据失败',
      onFinally: () => trackCopyJSONData()
    },
    [resources]
  );

  const copyFetchCurl = useToastCallback(
    async () => {
      const code = generateCurlCode({ filter, subject: props.subject });
      await navigator.clipboard.writeText(code);
    },
    {
      success: '复制 cURL 命令成功',
      error: '复制 cURL 命令失败',
      onFinally: () => trackCopyFetchCurl()
    },
    [filter, props.subject]
  );

  const copyFetchJS = useToastCallback(
    async () => {
      const code = generateJavaScriptCode({ filter, subject: props.subject });
      await navigator.clipboard.writeText(code);
    },
    {
      success: '复制 @animegarden/client JavaScript 代码成功',
      error: '复制 @animegarden/client JavaScript 代码失败',
      onFinally: () => trackCopyFetchJS()
    },
    [filter, props.subject]
  );

  const copyFetchPython = useToastCallback(
    async () => {
      const code = generatePythonCode({ filter, subject: props.subject });
      await navigator.clipboard.writeText(code);
    },
    {
      success: '复制 Python 代码成功',
      error: '复制 Python 代码失败',
      onFinally: () => trackCopyFetchPython()
    },
    [filter, props.subject]
  );

  const copyIframe = useToastCallback(
    async () => {
      const code = generateIframeCode({ filter, subject: props.subject });
      await navigator.clipboard.writeText(code);
    },
    {
      success: '复制网页嵌入代码成功',
      error: '复制网页嵌入代码失败',
      onFinally: () => trackCopyIframe()
    },
    [filter, props.subject]
  );

  return (
    <div className="inline-flex w-fit divide-x rounded-md">
      <Button
        variant="outline"
        size="sm"
        className="rounded-none rounded-s-md shadow-none focus-visible:z-10 outline-none!"
        onClick={copyRSS}
      >
        <span className="i-carbon-copy mr1"></span>
        <span>复制 RSS 订阅链接</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="border-l-0! border-r-1! px-2! rounded-none rounded-e-md focus-visible:z-10 outline-none! shadow-transparent!"
          >
            <span className="i-carbon-chevron-down text-xl"></span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" sideOffset={4} align="end" className="w-[200px]">
          <DropdownMenuItem onSelect={copyAllMagnetLinks}>
            <span className="i-mage-magnet-up mr1"></span>
            <span>复制所有磁力链接</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={copyJSONData}>
            <span className="i-mdi-code-json mr1"></span>
            <span>复制 JSON 数据</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={copyFetchCurl}>
            <span className="i-fluent-key-command-20-filled mr1"></span>
            <span>复制为 cURL 命令</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={copyFetchJS}>
            <span className="i-proicons-javascript mr1"></span>
            <span>复制为 JavaScript 代码</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={copyFetchPython}>
            <span className="i-proicons-python mr1"></span>
            <span>复制为 Python 代码</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={copyIframe}>
            <span className="i-solar-code-bold mr1"></span>
            <span>复制为网页嵌入代码</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export function FilterOperations(props: Props) {
  const { filter } = props;

  const [collection, setCollection] = useAtom(currentCollectionAtom);
  const setIsOpen = useSetAtom(isOpenSidebar);

  const resolved = filter ? resolveFilterOptions(filter) : ({} as ResolvedFilterOptions);

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

  return (
    <div className="flex items-center gap-4 lt-sm:gap-2 pt-4">
      <Button
        variant="outline"
        size="sm"
        className="add-collection"
        onClick={() => addToCollection()}
      >
        <span className="i-carbon:bookmark mr1"></span>
        <span>添加到收藏夹</span>
      </Button>
      <CopyResourcesDropdown {...props} />
      <SearchTooltip className="lt-sm:hidden" />
    </div>
  );
}
