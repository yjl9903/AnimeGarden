import { navigate } from 'astro:transitions/client';
import { findFansub, stringifySearchURL } from 'animegarden';

import { loading } from '../../state';

export const DMHY_RE = /(?:https:\/\/share.dmhy.org\/topics\/view\/)?(\d+_[a-zA-Z0-9_\-]+\.html)/;

export function parseSearch(search: string) {
  function splitWords(search: string) {
    const matchQuotes = {
      '"': ['"'],
      "'": ["'"],
      '“': ['”'],
      '”': ['“']
    };

    const words: string[] = [];
    let i = 0;
    while (i < search.length) {
      // Skip whitespaces
      while (i < search.length && /\s/.test(search[i])) i++;
      if (i >= search.length) break;

      let j = i;
      let word = '';
      while (j < search.length) {
        if (Object.keys(matchQuotes).includes(search[j])) {
          // Split by quote "..." or '...'
          const quote = matchQuotes[search[j] as keyof typeof matchQuotes];
          j++;
          let k = j;
          while (k < search.length) {
            if (quote.includes(search[k])) {
              break;
            } else if (search[k] === '\\' && k + 1 < search.length) {
              word += search[++k];
            } else {
              word += search[k];
            }
            k++;
          }
          // j -> quote
          j = k;
        } else if (search[j] === '\\' && j + 1 < search.length) {
          // \"
          j++;
          word += search[j];
        } else {
          // otherwise
          word += search[j];
        }
        j++;
      }

      words.push(word);
      i = j;
    }
    return words;
  }

  const splitted = splitWords(search);

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
  navigate(href, { history: 'push' });
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
