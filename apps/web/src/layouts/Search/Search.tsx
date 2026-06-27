import { Command } from 'cmdk';
import { useSelector } from '@tanstack/react-store';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type CompositionEvent,
  type InputEvent as ReactInputEvent,
  type KeyboardEvent,
  type RefObject,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import {
  trackSearchHistoryClick,
  trackSearchHistoryDelete,
  trackSearchResultClick,
  trackSearchSuggestionClick,
  trackSearchTrigger,
  type SearchTriggerSource
} from '~/utils';
import { resourcesQueryOptions, subjectSearchQueryOptions } from '~/query';
import {
  debounce,
  isDirectDetailURL,
  parseSearchInput,
  resolveSearchURL,
  stringifySearchTextAsync
} from './utils';
import { getSubjectDisplayName, getSubjectURL } from '~/utils/subject';
import { useAppStores } from '~/stores/hooks';
import { useActiveElement, useDocument, useEventListener } from '~/hooks';

const SEARCH_HELP_URL = `https://docs.animes.garden/animegarden/search.html`;

const SEARCH_SELECT_TRACK_WINDOW_MS = 300;

type RecentTrackRef = RefObject<{
  key?: string;
  timestamp?: number;
}>;

function trackOnceWithinWindow(trackedRef: RecentTrackRef, key: string, action: () => void) {
  const now = Date.now();
  if (
    trackedRef.current.key === key &&
    now - (trackedRef.current.timestamp ?? 0) < SEARCH_SELECT_TRACK_WINDOW_MS
  ) {
    return;
  }

  trackedRef.current = { key, timestamp: now };
  action();
}

export const Search = memo(() => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { inputStore, historiesStore } = useAppStores();
  const locationState = location.state as {
    trigger?: string;
    input?: string;
    state?: { trigger?: string };
  };
  const navigate = useNavigate();

  const ref = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { active } = useActiveElement();

  useEventListener(useDocument(), 'keypress', (ev: KeyboardEvent) => {
    if (ev.key === 's' || ev.key === '/' || (ev.key === 'k' && (ev.metaKey || ev.ctrlKey))) {
      const input = document.querySelector('#animegarden-search input');
      if (document.activeElement !== input) {
        // @ts-ignore
        input?.focus();
        ev.preventDefault();
        ev.stopPropagation();
      }
    }
  });

  const histories = useSelector(historiesStore);

  const input = useSelector(inputStore);
  const [search, setSearch] = useState(input);

  const goTo = (url: string, text = input) =>
    navigate({ to: url, state: { trigger: 'search', input: text } as any });

  useEffect(() => {
    const abort = new AbortController();

    if (locationState.trigger !== 'search') {
      const search = new URLSearchParams(location.searchStr);
      // @hack handle route /subject/:id
      if (location.pathname.startsWith('/subject/')) {
        const id = location.pathname.split('/')[2];
        if (/^\d+$/.test(id)) {
          search.set('subject', id);
        }
      }

      stringifySearchTextAsync(queryClient, search, abort.signal)
        .then((content) => {
          inputStore.setState(() => content);
        })
        .catch((error) => {
          if (abort.signal.aborted) return;
          console.error('[Search]', 'stringify search failed', error);
          inputStore.setState(() => '');
        });
    } else if (locationState.trigger === 'search' && typeof locationState.input === 'string') {
      inputStore.setState(() => locationState.input!);
    }

    // 清除 location.state
    if (locationState.state?.trigger === 'search') {
      history.replaceState(null, '');
    }

    return () => {
      abort.abort();
    };
  }, [location, queryClient]);

  const setDebounceSearch = debounce((value: string) => {
    if (value !== search) {
      setSearch(value);
    }
  }, 500);

  const signals = useRef<Set<AbortController>>(new Set());
  const stopFetch = useCallback(() => {
    for (const abort of signals.current) {
      abort.abort();
    }
    signals.current.clear();
  }, []);

  const enable = active === inputRef.current;
  const disable = useCallback(() => inputRef.current?.blur(), []);

  // Handle input change
  const onInputChange = useCallback((value: string) => {
    inputStore.setState(() => value);
    setDebounceSearch(value);
  }, []);
  const onCompositionEnd = useCallback((ev: CompositionEvent<HTMLInputElement>) => {
    const value = ev.currentTarget.value;
    // After 输入法 is confirmed, trigger search
    setDebounceSearch(value);
  }, []);
  const onInputKeydown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    const target = event.target as HTMLInputElement;
    if (event.key === 'Home') {
      target.selectionStart = 0;
      target.selectionEnd = 0;
      target.scrollLeft = 0;
      event.stopPropagation();
    } else if (event.key === 'End') {
      target.selectionStart = target.value.length;
      target.selectionEnd = target.value.length;
      target.scrollLeft = target.scrollWidth;
      event.stopPropagation();
    }
  }, []);
  const onInput = useCallback((ev: ReactInputEvent<HTMLInputElement>) => {
    const value = ev.currentTarget.value;
    // When using 输入法, not trigger search
    if (!ev.nativeEvent.isComposing) {
      setDebounceSearch(value);
    }
  }, []);

  const cleanUp = useCallback(() => {
    inputStore.setState(() => '');
    setSearch('');
  }, []);

  const selectGoToSearch = useCallback(
    async (text?: string, source: SearchTriggerSource = 'button') => {
      const target = text ?? input;
      if (target) {
        inputStore.setState(() => target);
        {
          // Filter old history item which is the substring of the current input
          const oldHistories = histories.filter((o) => !target.includes(o));
          // Remove duplicate items
          const newHistories = [...new Set([target, ...oldHistories])].slice(0, 10);
          // Set histories
          historiesStore.setState(() => newHistories);
        }

        trackSearchTrigger({
          text: target,
          source
        });

        stopFetch();
        goTo(await resolveSearchURL(queryClient, target));
        disable();
      }
    },
    [histories, input, queryClient, stopFetch]
  );

  const selectStatic = useCallback((key: string, text = input, isCleanUp = true) => {
    goTo(key, text);
    disable();
    isCleanUp && cleanUp();
  }, []);

  return (
    <Command
      id="animegarden-search"
      label="Command Menu"
      ref={ref}
      shouldFilter={false}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
        }
      }}
    >
      <div className="relative">
        <Command.Input
          id="animegarden-search-input"
          ref={inputRef}
          value={input}
          onInput={onInput}
          onKeyDown={onInputKeydown}
          onCompositionEnd={onCompositionEnd}
          onValueChange={(value) => inputStore.setState(() => value)}
          className={`${enable ? 'searched' : ''}`}
        />
        {input && (
          <>
            <span
              className="absolute right-[20px] top-0 h-[30px] flex items-center cursor-pointer"
              onMouseDown={() => cleanUp()}
            >
              <span className="i-carbon-close text-xl text-base-500 hover:text-base-900"></span>
            </span>
            <span className="absolute right-[20px] top-[4px] h-[22px] border-r"></span>
          </>
        )}

        <span
          className="absolute right-0 top-[-1px] h-[30px] flex items-center cursor-pointer"
          onMouseDown={() => selectGoToSearch(undefined, 'button')}
        >
          <span className="i-fluent:arrow-enter-24-filled text-base-500 hover:text-base-900"></span>
        </span>
      </div>
      <Command.List>
        {enable && input.trim() && (
          <Command.Item
            value="go-to-search-page"
            onMouseDown={() => selectGoToSearch(undefined, 'command')}
            onSelect={() => selectGoToSearch(undefined, 'command')}
          >
            {isDirectDetailURL(input) ? `前往 ${input}` : `在本页列出 ${input} 的搜索结果...`}
          </Command.Item>
        )}
        {enable && input.trim() && (
          <SearchSubject
            search={search}
            onInputChange={onInputChange}
            onSelect={selectStatic}
          ></SearchSubject>
        )}
        {enable && input && (
          <SearchResult
            search={search}
            signals={signals.current}
            onSelect={selectStatic}
            selectGoToSearch={() => selectGoToSearch(undefined, 'result-more')}
          ></SearchResult>
        )}
        {enable && !input.trim() && histories.length > 0 && (
          <SearchHistory
            selectGoToSearch={selectGoToSearch}
            onInputChange={onInputChange}
          ></SearchHistory>
        )}
        {enable && (
          <SearchCompletion input={input} onInputChange={onInputChange}></SearchCompletion>
        )}
      </Command.List>
    </Command>
  );
});

function SearchSubject(props: {
  search: string;
  onInputChange: (text: string) => void;
  onSelect: (key: string, text?: string, isCleanUp?: boolean) => void;
}) {
  const { search, onInputChange, onSelect } = props;
  const trackedRef = useRef<{ key?: string; timestamp?: number }>({});

  const keywords = useMemo(() => {
    const filter = parseSearchInput(search);
    return [...filter.search, ...filter.include];
  }, [search]);

  const { data } = useQuery({
    ...subjectSearchQueryOptions(keywords),
    enabled: keywords.length > 0
  });
  const bangumis = data?.subjects ?? [];

  const handleSuggestionSelect = useCallback(
    (bgm: (typeof bangumis)[number]) => {
      const text = '动画:' + getSubjectDisplayName(bgm);

      trackOnceWithinWindow(trackedRef, `subject:${bgm.id}`, () => {
        trackSearchSuggestionClick({
          text,
          subjectId: String(bgm.id)
        });
      });

      onInputChange(text);
      onSelect(getSubjectURL(bgm), text, false);
    },
    [bangumis, onInputChange, onSelect]
  );

  return (
    bangumis.length > 0 && (
      <Command.Group heading="动画">
        {bangumis.map((bgm) => (
          <Command.Item
            key={bgm.id}
            onMouseDown={() => handleSuggestionSelect(bgm)}
            onSelect={() => handleSuggestionSelect(bgm)}
          >
            {getSubjectDisplayName(bgm)}
          </Command.Item>
        ))}
      </Command.Group>
    )
  );
}

function SearchCompletion(props: { input: string; onInputChange: (text: string) => void }) {
  const { input, onInputChange } = props;

  return (
    <>
      <Command.Group heading="高级搜索">
        <Command.Item
          onMouseDown={() => {
            onInputChange(input + ' 包含:');
          }}
          onSelect={() => {
            onInputChange(input + ' 包含:');
          }}
        >
          包含关键词
        </Command.Item>
        <Command.Item
          onMouseDown={() => {
            onInputChange(input + ' 排除:');
          }}
          onSelect={() => {
            onInputChange(input + ' 排除:');
          }}
        >
          排除关键词
        </Command.Item>
        <Command.Item
          onMouseDown={() => {
            onInputChange(input + ' 字幕组:');
          }}
          onSelect={() => {
            onInputChange(input + ' 字幕组:');
          }}
        >
          筛选字幕组
        </Command.Item>
        <Command.Item
          onMouseDown={() => {
            onInputChange(input + ' 标题:');
          }}
          onSelect={() => {
            onInputChange(input + ' 标题:');
          }}
        >
          匹配标题
        </Command.Item>
        <Command.Item
          onMouseDown={() => {
            onInputChange(input + ' 晚于:');
          }}
          onSelect={() => {
            onInputChange(input + ' 晚于:');
          }}
        >
          上传时间晚于
        </Command.Item>
        <Command.Item
          onMouseDown={() => {
            onInputChange(input + ' 早于:');
          }}
          onSelect={() => {
            onInputChange(input + ' 早于:');
          }}
        >
          上传时间早于
        </Command.Item>
        <Command.Item
          onMouseDown={() => {
            onInputChange(input + ' 类型:');
          }}
          onSelect={() => {
            onInputChange(input + ' 类型:');
          }}
        >
          筛选资源类型
        </Command.Item>
        <Command.Item
          onMouseDown={() => window.open(SEARCH_HELP_URL)}
          onSelect={() => window.open(SEARCH_HELP_URL)}
        >
          高级搜索帮助
        </Command.Item>
      </Command.Group>
    </>
  );
}

function SearchResult(props: {
  search: string;
  signals: Set<AbortController>;
  onSelect: (text: string) => void;
  selectGoToSearch: () => void;
}) {
  const { search, onSelect, selectGoToSearch } = props;
  const trackedRef = useRef<{ key?: string; timestamp?: number }>({});

  const handleResultSelect = useCallback(
    (provider: string, providerId: string) => {
      const resource = `${provider}:${providerId}`;

      trackOnceWithinWindow(trackedRef, `resource:${resource}`, () => {
        trackSearchResultClick({
          text: search,
          resource
        });
      });

      onSelect(`/detail/${provider}/${providerId}`);
    },
    [onSelect, search]
  );

  const filter = useMemo(() => {
    if (!search) return null;
    if (isDirectDetailURL(search)) return null;

    const filter = parseSearchInput(search);

    if (
      filter.include.length === 0 &&
      filter.keywords.length === 0 &&
      filter.search.length === 0 &&
      filter.subjects.length === 0
    ) {
      return null;
    }

    return filter;
  }, [search]);

  const { data: searchResult, isLoading } = useQuery({
    ...resourcesQueryOptions({ ...filter!, page: 1, pageSize: 5 }),
    enabled: filter !== null,
    select: (res) => res.resources
  });

  if (isLoading || searchResult) {
    return (
      <Command.Group heading="搜索结果">
        {isLoading ? (
          <SearchLoading search={search}></SearchLoading>
        ) : (
          (!searchResult || searchResult.length === 0) && (
            <Command.Loading>没有搜索到任何匹配的资源.</Command.Loading>
          )
        )}
        {searchResult &&
          searchResult.map((r) => (
            <Command.Item
              key={r.href}
              value={r.href}
              onSelect={() => handleResultSelect(r.provider, r.providerId)}
              onMouseDown={() => handleResultSelect(r.provider, r.providerId)}
            >
              {r.title}
            </Command.Item>
          ))}
        {searchResult && searchResult.length > 0 && (
          <Command.Item
            value="go-to-search-page"
            onMouseDown={() => selectGoToSearch()}
            onSelect={() => selectGoToSearch()}
          >
            {`展示更多 ${search} 的搜索结果...`}
          </Command.Item>
        )}
      </Command.Group>
    );
  }

  return null;
}

function SearchLoading(props: { search: string }) {
  const { search } = props;

  return (
    <Command.Loading>
      <div className="flex items-center">
        <div className="lds-ring">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <span>正在搜索 {search} ...</span>
      </div>
    </Command.Loading>
  );
}

function SearchHistory(props: {
  selectGoToSearch: (text: string, source?: SearchTriggerSource) => void;
  onInputChange: (text: string) => void;
}) {
  const { historiesStore } = useAppStores();
  const histories = useSelector(historiesStore);
  const { selectGoToSearch, onInputChange } = props;

  const onClearHistories = useCallback(
    (ev: React.MouseEvent) => {
      trackSearchHistoryDelete({
        action: 'clear',
        count: String(histories.length)
      });
      historiesStore.setState(() => []);
      ev.stopPropagation();
      ev.preventDefault();
    },
    [histories]
  );

  const onRemoveHistory = useCallback(
    (ev: React.MouseEvent, item: string) => {
      trackSearchHistoryDelete({
        action: 'remove',
        text: item
      });
      const filterHistories = histories.filter((content) => content !== item);
      historiesStore.setState(() => filterHistories);

      ev.stopPropagation();
      ev.preventDefault();
    },
    [histories]
  );

  return (
    <Command.Group
      heading={
        <div className="flex justify-between w-full">
          <div>搜索历史</div>
          <button className="text-link pr4 inline-block" onMouseDown={(ev) => onClearHistories(ev)}>
            <span className="mr-[-50%]">清空</span>
          </button>
        </div>
      }
    >
      {[...new Set(histories)].map((h) => (
        <Command.Item
          key={h}
          onMouseDown={(ev) => {
            trackSearchHistoryClick(h);
            selectGoToSearch(h, 'history');
            ev.stopPropagation();
            ev.preventDefault();
          }}
          onSelect={() => {
            onInputChange(h);
          }}
        >
          {
            <div className="flex justify-between items-center w-full">
              {/* TODO: fix in cmdk lib */}
              <div>{h.replace(/"/g, '')}</div>
              <button
                className="i-carbon-close text-2xl text-base-500 hover:text-base-900"
                onMouseDown={(ev) => onRemoveHistory(ev, h)}
              />
            </div>
          }
        </Command.Item>
      ))}
    </Command.Group>
  );
}
