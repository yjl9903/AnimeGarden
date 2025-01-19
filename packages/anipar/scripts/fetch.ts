import { fetchResources } from '@animegarden/client';

import { parse } from '../src';

for (let page = 1; ; page++) {
  const { resources } = await fetchResources(fetch, { page, type: '动画' });
  for (const r of resources) {
    const info = parse(r.title);
    console.log(`${r.title}: ${info?.title ?? '[ERROR]'}`);
  }
}
