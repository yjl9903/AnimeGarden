import useSWR from 'swr';
import { Command } from 'cmdk';
import { subDays } from 'date-fns';
import { useStore } from '@nanostores/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchResources } from '../../fetch';
import { fansubs, types } from '../../constant';
import { histories, clearHistories, pushHistory, removeHistory } from '../../state';

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
    if (ev.key === 's' || ev.key === '/') {
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

  const history = useStore(histories);
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
  const { data: searchResult, isLoading } = useSWR(
    () => {
      if (!search) return null;
      const hasBuiltin = types.some((t) => t.includes(search));
      if (hasBuiltin) return null;
      return search;
    },
    async (search) => {
      if (DMHY_RE.test(search)) {
        return [];
      } else {
        const abort = new AbortController();
        signals.current.add(abort);

        const filter = parseSearch(search);
        if (!filter.after) {
          const lastWeek = subDays(new Date(), 7);
          lastWeek.setHours(0, 0, 0, 0);
          filter.after = lastWeek;
        }

        const res = await fetchResources(
          { ...filter, page: 1 },
          {
            signal: abort.signal
          }
        );
        signals.current.delete(abort);
        return res.resources;
      }
    }
  );

  const filteredFansub = fansubs.filter((f) => f.name.includes(input));
  const filteredTypes = types.filter((t) => t.includes(input));

  const enable = active === inputRef.current;
  const disable = useCallback(() => inputRef.current?.blur(), []);

  const onInputChange = useCallback((value: string) => {
    setInput(value);
    setDebounceSearch(value);
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
    return () => {
      goTo(key);
      cleanUp();
    };
  }, []);

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
        onValueChange={onInputChange}
        className={`${enable ? 'searched' : ''}`}
      />
      <Command.List>
        {input && enable && (
          <>
            <Command.Group heading="搜索">
              {isLoading ? (
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
              ) : (
                <Command.Empty>没有找到任何最近一周内的结果.</Command.Empty>
              )}
              <Command.Item
                value="go-to-search-page"
                onMouseDown={() => selectGoToSearch()}
                onSelect={() => selectGoToSearch()}
              >
                {DMHY_RE.test(input) ? `前往 ${input}` : `在本页列出 ${input} 的搜索结果...`}
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  onInputChange(input + ' 字幕组:');
                }}
              >
                筛选字幕组
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  onInputChange(input + ' 包含:');
                }}
              >
                包含关键词
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  onInputChange(input + ' 开始:');
                }}
              >
                创建开始时间
              </Command.Item>
            </Command.Group>
            {searchResult && (
              <Command.Group heading="搜索结果">
                {searchResult.map((r) => (
                  <Command.Item
                    key={r.href}
                    value={r.href}
                    onMouseDown={selectStatic(`/resource/${r.href.split('/').at(-1)}`)}
                    onSelect={selectStatic(`/resource/${r.href.split('/').at(-1)}`)}
                  >
                    {r.title}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </>
        )}
        {enable && history.length > 0 && (
          <Command.Group
            heading={
              <div className="flex justify-between w-full">
                <div>搜索历史</div>
                <button
                  className="text-link pr4 inline-block"
                  onMouseDown={(ev) => onClearHistories(ev)}
                >
                  <span className="mr-[-50%]">清空</span>
                </button>
              </div>
            }
          >
            {history.map((h) => (
              <Command.Item key={h}>
                {
                  <div className="flex justify-between items-center w-full">
                    <div
                      onMouseDown={(ev) => {
                        selectGoToSearch(h);
                        ev.stopPropagation();
                        ev.preventDefault();
                      }}
                      onSelect={() => {
                        onInputChange(h);
                      }}
                    >
                      {h}
                    </div>
                    <button
                      className="i-carbon-close text-2xl text-base-500 hover:text-base-900"
                      onMouseDown={(ev) => onRemoveHistory(ev, h)}
                    />
                  </div>
                }
              </Command.Item>
            ))}
          </Command.Group>
        )}
        {enable && (
          <>
            {filteredTypes.length > 0 && (
              <Command.Group heading="类型">
                {filteredTypes.map((type) => (
                  <Command.Item
                    key={type}
                    onMouseDown={selectStatic(`/resources/1?type=${type}`)}
                    onSelect={selectStatic(`/resources/1?type=${type}`)}
                  >
                    {type}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            {filteredFansub.length > 0 && (
              <Command.Group heading="字幕组">
                {filteredFansub.map((fansub) => (
                  <Command.Item
                    key={fansub.id}
                    onMouseDown={selectStatic(`/resources/1?fansubId=${fansub.id}`)}
                    onSelect={selectStatic(`/resources/1?fansubId=${fansub.id}`)}
                  >
                    {fansub.name}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </>
        )}
      </Command.List>
    </Command>
  );
}
