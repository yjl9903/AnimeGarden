import { Command } from 'cmdk';
import { useRef, useState } from 'react';

import '../styles/cmdk.css';

import { fansubs, types } from '../constant';

export default function Search() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState('');

  return (
    <Command label="Command Menu" ref={ref}>
      <Command.Input
        value={search}
        onValueChange={(value) => setSearch(value)}
        className={`${!!search ? 'searched' : ''}`}
      />
      <Command.List>
        {search && (
          <>
            <Command.Empty>没有找到任何结果.</Command.Empty>
            <Command.Group heading="搜索"></Command.Group>
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
