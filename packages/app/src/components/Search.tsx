import type { Resource } from 'animegarden';

import { Command } from 'cmdk';
import { useCallback, useEffect, useRef, useState } from 'react';

import '../styles/cmdk.css';

import { fansubs, types } from '../constant';
import { fetchResources } from '../fetch';

export default function Search() {
  const ref = useRef<HTMLDivElement | null>(null);

  const [search, setSearch] = useState('');
  const [searchResult, setSearchResult] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const searchResources = useCallback(
    debounce(async (search: string) => {
      setSearchResult([]);
      const r = await fetchResources(1, { search: search.split(' ').filter(Boolean) });
      setSearchResult(r);
      setLoading(false);
    }),
    []
  );
  const onSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (value) {
      const hasBuiltin =
        fansubs.some((f) => f.name.includes(value)) || types.some((t) => t.includes(value));
      if (!hasBuiltin) {
        setLoading(true);
        searchResources(value);
      } else {
        setLoading(false);
      }
    }
  }, []);

  const cleanUp = useCallback(() => {
    setLoading(false);
    setSearch('');
    setSearchResult([]);
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
        value={search}
        onValueChange={onSearchChange}
        className={`${!!search ? 'searched' : ''}`}
      />
      <Command.List>
        {search && (
          <>
            {loading ? (
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
            <Command.Group heading="类型">
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
            <Command.Group heading="搜索结果">
              {searchResult.map((r) => (
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
            </Command.Group>
          </>
        )}
      </Command.List>
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
