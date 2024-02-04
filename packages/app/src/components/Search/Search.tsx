import useSWR from 'swr';
import { Command } from 'cmdk';
import { useStore } from '@nanostores/react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';

import { fetchResources } from '../../fetch';
import { histories as historiesState } from '../../state';

import { useActiveElement } from './hooks';
import {
  DMHY_RE,
  SEARCH_INPUT_KEY,
  debounce,
  goTo,
  goToSearch,
  parseSearch,
  stringifySearch
} from './utils';

{
  document.addEventListener('keypress', (ev) => {
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

  document.addEventListener('astro:beforeload', () => {});
}

export default function Search() {
  const ref = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { active } = useActiveElement();

  const histories = useStore(historiesState);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fn = () => {
      try {
        const input = window.sessionStorage.getItem(SEARCH_INPUT_KEY);
        window.sessionStorage.removeItem(SEARCH_INPUT_KEY);
        if (input) {
          setInput(input);
        } else {
          if (location.pathname.startsWith('/resources/')) {
            const content = stringifySearch(new URLSearchParams(location.search));
            setInput(content);
          } else {
            setInput('');
          }
        }
      } catch {}
    };

    fn();
    document.addEventListener('astro:page-load', fn);
    return () => {
      document.removeEventListener('astro:page-load', fn);
    };
  }, []);

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
    setInput(value);
    setDebounceSearch(value);
  }, []);
  const onCompositionEnd = useCallback((ev: FormEvent<HTMLInputElement>) => {
    const e = ev.nativeEvent as InputEvent;
    const value = (e.target as HTMLInputElement).value;
    // After 输入法 is confirmed, trigger search
    setDebounceSearch(value);
  }, []);
  const onInput = useCallback((ev: FormEvent<HTMLInputElement>) => {
    const e = ev.nativeEvent as InputEvent;
    const value = (e.target as HTMLInputElement).value;
    // When using 输入法, not trigger search
    if (!e.isComposing) {
      setDebounceSearch(value);
    }
  }, []);

  const cleanUp = useCallback(() => {
    setInput('');
    setSearch('');
  }, []);

  const selectGoToSearch = useCallback(
    (text?: string) => {
      const target = text ?? input;
      if (target) {
        setInput(target);
        pushHistory(target);

        stopFetch();
        goToSearch(target);
        disable();
      }
    },
    [input]
  );

  const selectStatic = useCallback((key: string) => {
    goTo(key);
    cleanUp();
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
      <Command.Input
        id="animegarden-search-input"
        ref={inputRef}
        value={input}
        onInput={onInput}
        onCompositionEnd={onCompositionEnd}
        onValueChange={setInput}
        className={`${enable ? 'searched' : ''}`}
      />
      <Command.List>
        {enable && input.trim() && (
          <Command.Item
            value="go-to-search-page"
            onMouseDown={() => selectGoToSearch()}
            onSelect={() => selectGoToSearch()}
          >
            {DMHY_RE.test(input) ? `前往 ${input}` : `在本页列出 ${input} 的搜索结果...`}
          </Command.Item>
        )}
        {enable && input && (
          <SearchResult
            search={search}
            signals={signals.current}
            onSelect={selectStatic}
            selectGoToSearch={() => selectGoToSearch()}
          ></SearchResult>
        )}
        {enable && !input.trim() && histories.length > 0 && (
          <SearchHistory
            histories={histories}
            selectGoToSearch={() => selectGoToSearch()}
            onInputChange={onInputChange}
          ></SearchHistory>
        )}
        {enable && (
          <SearchCompletion input={input} onInputChange={onInputChange}></SearchCompletion>
        )}
      </Command.List>
    </Command>
  );
}

function SearchCompletion(props: { input: string; onInputChange: (text: string) => void }) {
  const { input, onInputChange } = props;

  return (
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
          onInputChange(input + ' 类型:');
        }}
        onSelect={() => {
          onInputChange(input + ' 类型:');
        }}
      >
        筛选资源类型
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
    </Command.Group>
  );
}

function SearchResult(props: {
  search: string;
  signals: Set<AbortController>;
  onSelect: (text: string) => void;
  selectGoToSearch: () => void;
}) {
  const { search, signals, onSelect, selectGoToSearch } = props;

  const { data: searchResult, isLoading } = useSWR(
    () => {
      if (!search) return null;
      if (DMHY_RE.test(search)) return null;

      const filter = parseSearch(search);
      // Disable search without any keywords
      if (filter.include.length === 0 && filter.search.length === 0) {
        return null;
      }

      return filter;
    },
    async (filter) => {
      const abort = new AbortController();
      signals.add(abort);
      try {
        const res = await fetchResources(
          { ...filter, page: 1, pageSize: 10 },
          {
            signal: abort.signal
          }
        );
        return res.resources;
      } catch {
        signals.delete(abort);
      }
    }
  );

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
              onSelect={() => onSelect(`/detail/${r.provider}/${r.providerId}`)}
              onMouseDown={() => onSelect(`/detail/${r.provider}/${r.providerId}`)}
            >
              {r.title}
            </Command.Item>
          ))}
        {searchResult && (
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
  histories: string[];
  selectGoToSearch: (text: string) => void;
  onInputChange: (text: string) => void;
}) {
  const { histories, selectGoToSearch, onInputChange } = props;

  const onClearHistories = (ev: React.MouseEvent) => {
    clearHistories();
    ev.stopPropagation();
    ev.preventDefault();
  };

  const onRemoveHistory = (ev: React.MouseEvent, item: string) => {
    removeHistory(item);
    ev.stopPropagation();
    ev.preventDefault();
  };

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
      {histories.map((h) => (
        <Command.Item
          key={h}
          onMouseDown={(ev) => {
            selectGoToSearch(h);
            ev.stopPropagation();
            ev.preventDefault();
          }}
          onSelect={() => {
            onInputChange(h);
          }}
        >
          {
            <div className="flex justify-between items-center w-full">
              <div>{h}</div>
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

function pushHistory(text: string) {
  // Filter old history item which is the substring of the current input
  const oldHistories = historiesState.get().filter((o) => !text.includes(o));
  // Remove duplicate items
  const newHistories = [...new Set([text, ...oldHistories])].slice(0, 10);
  // Set histories
  historiesState.set(newHistories);
}

function removeHistory(item: string) {
  const filterHistories = historiesState.get().filter((content) => content !== item);
  historiesState.set(filterHistories);
}

function clearHistories() {
  historiesState.set([]);
}
