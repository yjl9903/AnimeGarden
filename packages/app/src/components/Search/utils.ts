import { findFansub, stringifySearchURL } from 'animegarden';

import { histories, loading } from '../../state';

export const DMHY_RE = /(?:https:\/\/share.dmhy.org\/topics\/view\/)?(\d+_[a-zA-Z0-9_\-]+\.html)/;

export function parseSearch(search: string) {
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
        const found = findFansub(word, { fuzzy: true });
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

export function resolveSearchURL(search: string) {
  if (search.startsWith(location.origin)) {
    return search.slice(location.origin.length);
  } else if (search.startsWith(location.host)) {
    return search.slice(location.host.length);
  } else {
    const match = DMHY_RE.exec(search);
    if (match) {
      return `/resource/${match[1]}`;
    } else {
      const url = stringifySearchURL(location.origin, parseSearch(search));
      return `${url.pathname}${url.search}`;
    }
  }
}

export function goToSearch(search: string) {
  return goTo(resolveSearchURL(search));
}

export function goTo(href: string) {
  loading.set(true);
  // window.location.href = href;
  window.open(href, '_self');
}

export function debounce<T extends (...args: any[]) => void>(fn: T, time = 1000): T {
  let timestamp: any;
  return ((...args: any[]) => {
    clearTimeout(timestamp);
    timestamp = setTimeout(() => {
      fn(...args);
    }, time);
  }) as T;
}
