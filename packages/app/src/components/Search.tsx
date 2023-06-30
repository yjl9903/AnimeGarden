import useSWR from 'swr';
import { Command } from 'cmdk';
import { useStore } from '@nanostores/react';
import { findFansub, stringifySearchURL } from 'animegarden';
import { useCallback, useEffect, useRef, useState } from 'react';

import '../styles/cmdk.css';

import { fetchResources } from '../fetch';
import { fansubs, types } from '../constant';
import { histories, loading } from '../state';

{
  document.addEventListener('keypress', (ev) => {
    if (ev.key === 's' || ev.key === '/') {
      const input = document.querySelector('#animegarden-search input');
      // @ts-ignore
      input?.focus();
      ev.preventDefault();
      ev.stopPropagation();
    }
  });
}

const DMHY_RE = /(?:https:\/\/share.dmhy.org\/topics\/view\/)?(\d+_[a-zA-Z0-9_\-]+\.html)/;

const useActiveElement = () => {
  const [listenersReady, setListenersReady] = useState(false);
  const [activeElement, setActiveElement] = useState(document.activeElement);

  useEffect(() => {
    const onFocus = (event: FocusEvent) => setActiveElement(event.target as any);
    const onBlur = (event: FocusEvent) => setActiveElement(null);

    window.addEventListener('focus', onFocus, true);
    window.addEventListener('blur', onBlur, true);

    setListenersReady(true);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return {
    active: activeElement,
    ready: listenersReady
  };
};

const initialized = {
  url: location as Location | undefined
};

export default function Search() {
  const ref = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { active } = useActiveElement();

  const history = useStore(histories);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');

  // Init search input
  if (initialized.url !== undefined) {
    const searchParams = new URLSearchParams(initialized.url.search);
    const cmd = searchParams.get('cmd');
    if (cmd !== undefined && typeof cmd === 'string') {
      setInput(cmd);
      setSearch(cmd);
    }
    initialized.url = undefined;
  }

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
        const res = await fetchResources(1, parseSearch(search), {
          signal: abort.signal
        });
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
        // Filter old history item which is the substring of the current input
        const oldHistories = histories.get().filter((o) => !target.includes(o));
        // Remove duplicate items
        const newHistories = [...new Set([target, ...oldHistories])].slice(0, 10);
        // Set histories
        histories.set(newHistories);

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
                <Command.Empty>没有找到任何结果.</Command.Empty>
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
          <Command.Group heading="搜索历史">
            {history.map((h) => (
              <Command.Item
                key={h}
                value={h}
                onMouseDown={() => {
                  selectGoToSearch(h);
                }}
                onSelect={() => {
                  onInputChange(h);
                }}
              >
                {h}
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
                    onMouseDown={selectStatic(`/resources/1?fansub=${fansub.id}`)}
                    onSelect={selectStatic(`/resources/1?fansub=${fansub.id}`)}
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

function parseSearch(search: string) {
  const splitted = search
    .split(' ')
    .map((s) => s.trim())
    .filter(Boolean);

  const keywords: string[] = [];
  const include: string[] = [];
  const exclude: string[] = [];

  const fansub: number[] = [];
  const after: Date[] = [];
  const before: Date[] = [];

  const handlers: Record<string, (word: string) => void> = {
    '+,include:,包含:': (word) => {
      include.push(word);
    },
    '!,！,-,exclude:排除:': (word) => {
      exclude.push(word);
    },
    'fansub:,字幕:,字幕组:': (word) => {
      if (/^\d$/.test(word)) {
        fansub.push(+word);
      } else {
        const found = findFansub(word);
        if (found) {
          fansub.push(found.id);
        }
      }
    },
    'after:,开始:': (word) => {
      after.push(new Date(word));
    },
    'before:,结束:': (word) => {
      before.push(new Date(word));
    }
  };

  for (const word of splitted) {
    let found = false;
    for (const [keys, handler] of Object.entries(handlers)) {
      for (const key of keys.split(',')) {
        if (word.startsWith(key) || word.startsWith(key.replace(':', '：'))) {
          const text = word.slice(key.length);
          if (text.length > 0) {
            handler(text);
            found = true;
            break;
          }
        }
      }
      if (found) break;
    }
    if (!found) {
      keywords.push(word.replace(/\+/g, '%2b'));
    }
  }

  return {
    search: keywords,
    include,
    exclude,
    fansubId: fansub,
    after: after.at(-1),
    before: before.at(-1)
  };
}

function goToSearch(search: string) {
  if (search.startsWith(location.origin)) {
    goTo(search.slice(location.origin.length));
  } else if (search.startsWith(location.host)) {
    goTo(search.slice(location.host.length));
  } else {
    const match = DMHY_RE.exec(search);
    if (match) {
      goTo(`/resource/${match[1]}`);
    } else {
      const url = stringifySearchURL(location.origin, parseSearch(search));
      url.searchParams.set('cmd', search);
      goTo(`${url.pathname}${url.search}`);
    }
  }
}

function goTo(href: string) {
  loading.set(true);
  window.location.href = href;
}

function debounce<T extends (...args: any[]) => void>(fn: T, time = 1000): T {
  let timestamp: any;
  return ((...args: any[]) => {
    clearTimeout(timestamp);
    timestamp = setTimeout(() => {
      fn(...args);
    }, time);
  }) as T;
}
