import type { Resource } from 'animegarden';

import { Command } from 'cmdk';
import { useCallback, useMemo, useRef, useState } from 'react';

import '../styles/cmdk.css';

import { fansubs, types } from '../constant';
import { fetchResources } from '../fetch';

export default function Search() {
  const ref = useRef<HTMLDivElement | null>(null);

  const [search, setSearch] = useState('');
  const [searchResult, setSearchResult] = useState<Resource[]>([]);
  const searchResources = useCallback(
    debounce(async (search: string) => {
      setSearchResult([]);
      const r = await fetchResources(1, { search: search.split(' ').filter(Boolean) });
      setSearchResult(r);
    }),
    []
  );
  const onSearchChange = useCallback((value: string) => {
    setSearch(value);
    searchResources(value);
  }, []);

  return (
    <Command label="Command Menu" ref={ref}>
      <Command.Input
        value={search}
        onValueChange={onSearchChange}
        className={`${!!search ? 'searched' : ''}`}
      />
      <Command.List>
        {search && (
          <>
            <Command.Empty>没有找到任何结果.</Command.Empty>
            <Command.Group heading="搜索结果">
              {searchResult.map((r) => (
                <Command.Item key={r.href}>{r.title}</Command.Item>
              ))}
            </Command.Group>
            <Command.Group heading="类型">
              {types.map((type) => (
                <Command.Item
                  key={type}
                  onSelect={() => {
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
                    window.location.pathname = `/fansub/${fansub.id}/1`;
                  }}
                >
                  {fansub.name}
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
