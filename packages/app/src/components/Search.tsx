import useSWR from 'swr';
import { Command } from 'cmdk';
import { useCallback, useEffect, useRef, useState } from 'react';

import '../styles/cmdk.css';

import { fansubs, types } from '../constant';
import { fetchResources } from '../fetch';

export default function Search() {
  const ref = useRef<HTMLDivElement | null>(null);

  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');

  const setDebounceSearch = debounce((value: string) => {
    setSearch(value);
  }, 500);

  const { data: searchResult, isLoading } = useSWR(
    () => {
      if (!search) return null;
      const hasBuiltin =
        fansubs.some((f) => f.name.includes(search)) || types.some((t) => t.includes(search));
      if (hasBuiltin) return null;
      return search;
    },
    async (search) => {
      return await fetchResources(1, { search: search.split(' ').filter(Boolean) });
    }
  );

  const enable = !!input;
  const hasSearchResult = searchResult && searchResult.length > 0;

  const onInputChange = useCallback((value: string) => {
    setInput(value);
    setDebounceSearch(value);
  }, []);

  const cleanUp = useCallback(() => {
    setInput('');
    setSearch('');
  }, []);

  useEffect(() => {
    const fn = () => {
      cleanUp();
    };
    document.addEventListener('click', fn);
    return () => {
      document.removeEventListener('click', fn);
    };
  }, []);

  return (
    <Command
      label="Command Menu"
      ref={ref}
      shouldFilter={!hasSearchResult}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
          cleanUp();
          e.preventDefault();
        }
      }}
    >
      <Command.Input
        value={input}
        onValueChange={onInputChange}
        className={`${!!input ? 'searched' : ''}`}
      />
      {enable && (
        <>
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
          {!hasSearchResult && (
            <>
              <Command.Group heading="类型">
                <Command.List>
                  {types.map((type) => (
                    <Command.Item
                      key={type}
                      onSelect={() => {
                        cleanUp();
                        window.location.pathname = `/type/${type}/1`;
                      }}
                    >
                      {type}
                    </Command.Item>
                  ))}
                </Command.List>
              </Command.Group>
              <Command.Group heading="字幕组">
                {fansubs.map((fansub) => (
                  <Command.Item
                    key={fansub.id}
                    onSelect={() => {
                      cleanUp();
                      window.location.pathname = `/fansub/${fansub.id}/1`;
                    }}
                  >
                    {fansub.name}
                  </Command.Item>
                ))}
              </Command.Group>
            </>
          )}
          <Command.Group heading="搜索结果">
            <Command.List>
              {searchResult &&
                searchResult.map((r) => (
                  <Command.Item
                    key={r.href}
                    onSelect={() => {
                      cleanUp();
                      window.location.pathname = `/resource/${r.href.split('/').at(-1)}`;
                    }}
                  >
                    {r.title}
                  </Command.Item>
                ))}
            </Command.List>
          </Command.Group>
        </>
      )}
    </Command>
  );
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
