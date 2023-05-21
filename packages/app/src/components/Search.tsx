import useSWR from 'swr';
import { Command } from 'cmdk';
import { useCallback, useEffect, useRef, useState } from 'react';

import '../styles/cmdk.css';

import { fansubs, types } from '../constant';
import { fetchResources } from '../fetch';

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
    setSearch(value);
  }, 500);

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
        return await fetchResources(1, { ...parseSearch(search) });
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

  return (
    <Command
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
              onSelect={() => {
                if (input) {
                  cleanUp();
                  goToSearch(input);
                  disable();
                }
              }}
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
                  onSelect={() => {
                    cleanUp();
                    goTo(`/resource/${r.href.split('/').at(-1)}`);
                  }}
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
                    onSelect={() => {
                      cleanUp();
                      goTo(`/resources/1?type=${type}`);
                    }}
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
                    onSelect={() => {
                      cleanUp();
                      goTo(`/resources/1?fansub=${fansub.id}`);
                    }}
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
  const include = splitted.filter((v) => v[0] !== '!' && v[0] !== '！');
  const exclude = splitted.filter((v) => v[0] === '!' || v[0] === '！').map((v) => v.slice(1));
  return {
    include,
    exclude
  };
}

function goToSearch(search: string) {
  const match = DMHY_RE.exec(search);
  if (match) {
    goTo(`/resource/${match[1]}`);
  } else {
    const { include, exclude } = parseSearch(search);
    goTo(`/resources/1?include=${JSON.stringify(include)}&exclude=${JSON.stringify(exclude)}`);
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
