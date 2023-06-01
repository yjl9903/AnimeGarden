import useSWR from 'swr';
import { Command } from 'cmdk';
import { tradToSimple } from 'simptrad';
import { useCallback, useEffect, useRef, useState } from 'react';

import '../styles/cmdk.css';

import { fansubs, types } from '../constant';
import { fetchResources } from '../fetch';

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

export default function Search() {
  const ref = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { active } = useActiveElement();

  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');

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
        const res = await fetchResources(1, { ...parseSearch(search), signal: abort.signal });
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

  const selectGoToSearch = useCallback(() => {
    if (input) {
      stopFetch();
      goToSearch(input);
      cleanUp();
      disable();
    }
  }, [input]);
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
          <Command.Group heading="搜索结果">
            <Command.Item
              value="go-to-search-page"
              onMouseDown={selectGoToSearch}
              onSelect={selectGoToSearch}
            >
              {DMHY_RE.test(input) ? `前往 ${input}` : `在本页列出 ${input} 的搜索结果...`}
            </Command.Item>
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
            {searchResult &&
              searchResult.map((r) => (
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
    '+,包含:': (word) => {
      include.push(word);
    },
    '!,！,-,排除:': (word) => {
      exclude.push(word);
    },
    'fansub:,字幕:,字幕组:': (word) => {
      if (/^\d$/.test(word)) {
        fansub.push(+word);
      } else {
        word = tradToSimple(word);
        const found = fansubs.find((t) => tradToSimple(t.name).includes(word));
        if (found) {
          fansub.push(found.id);
        } else {
          word = word.replace('樱', '桜');
          const found = fansubs.find((t) => tradToSimple(t.name).includes(word));
          if (found) {
            fansub.push(found.id);
          }
        }
      }
    },
    'after:': (word) => {
      after.push(new Date(word));
    },
    'before:': (word) => {
      before.push(new Date(word));
    }
  };

  for (const word of splitted) {
    let found = false;
    for (const [keys, handler] of Object.entries(handlers)) {
      for (const key of keys.split(',')) {
        if (word.startsWith(key) || word.startsWith(key.replace(':', '：'))) {
          handler(word.slice(key.length));
          found = true;
          break;
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
    fansub: fansub.at(-1),
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
      const { search: keywords, include, exclude, fansub, after } = parseSearch(search);
      const query = [
        `search=${JSON.stringify(keywords)}`,
        `include=${JSON.stringify(include)}`,
        `exclude=${JSON.stringify(exclude)}`
      ];
      if (fansub !== undefined) {
        query.push(`fansub=${fansub}`);
      }
      if (after !== undefined) {
        query.push(`after=${after.toISOString()}`);
      }
      goTo(`/resources/1?${query.join('&')}`);
    }
  }
}

function goTo(href: string) {
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
