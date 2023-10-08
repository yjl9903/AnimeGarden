import type { ResolvedFilterOptions } from 'animegarden';

import { preferFansubs } from '../state';

document.addEventListener('astro:page-load', () => {
  const resp = document.querySelector('#fetch-response') as HTMLElement | null;
  if (resp) {
    const filter = JSON.parse(resp.dataset.filter ?? '') as ResolvedFilterOptions;
    if (filter.fansubId) {
      const fansub = new Set([...filter.fansubId, ...preferFansubs.get()].filter(Boolean));
      preferFansubs.set(fansub);
      reorderFansub(fansub);
    }
  }
});

export function reorderFansub(order: Set<number>) {
  const dropdown = document.querySelector('#fansub-dropdown') as HTMLElement | null;
  if (dropdown) {
    const children = Array.from(dropdown.children).filter((n) =>
      n.classList.contains('fansub-item')
    ) as HTMLElement[];
    const map = new Map<number, HTMLElement>();
    const otherItem: HTMLElement[] = [];
    for (const c of children) {
      if (c.dataset.fansubId) {
        const id = +c.dataset.fansubId;
        map.set(id, c);
        if (!order.has(id)) {
          otherItem.push(c);
        }
      }
    }

    for (const id of order) {
      const c = map.get(id);
      if (c) {
        dropdown.appendChild(c);
      }
    }
    for (const c of otherItem) {
      dropdown.appendChild(c);
    }
  }
}
