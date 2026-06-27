import {
  type FilterOptions,
  type PresetType,
  parseURLSearch,
  stringifyURLSearch
} from '@animegarden/client';
import type { QueryClient } from '@tanstack/react-query';

import { PRESET_DISPLAY_NAME } from '../../utils/constants';
import type { SubjectInfo } from '../../utils/subject';
import { subjectQueryOptions, subjectsByNameQueryOptions } from '../../query/subject';

export const DMHY_RE = /(?:https:\/\/share.dmhy.org\/topics\/view\/)?(\d+_[a-zA-Z0-9_\-]+\.html)/;

// TODO: support other mikan url
export const MIKAN_RE =
  /(?:https?:\/\/mikanani\.kas\.pub\/Home\/Episode\/|\/Home\/Episode\/)?([0-9a-fA-F]{40})/;

export function matchDirectDetailURL(search: string) {
  const dmhy = DMHY_RE.exec(search);
  if (dmhy) {
    return {
      provider: 'dmhy',
      providerId: dmhy[1]
    } as const;
  }

  const mikan = MIKAN_RE.exec(search);
  if (mikan) {
    return {
      provider: 'mikan',
      providerId: mikan[1].toLowerCase()
    } as const;
  }

  return undefined;
}

export function isDirectDetailURL(search: string) {
  return matchDirectDetailURL(search) !== undefined;
}

export function parseSearchInput(input: string) {
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
      while (j < search.length && !/\s/.test(search[j])) {
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

  const splitted = splitWords(input);

  const subjects: string[] = [];

  const search: string[] = [];
  const include: string[] = [];
  const keywords: string[] = [];
  const exclude: string[] = [];

  const publishers: string[] = [];
  const fansubs: string[] = [];
  const types: string[] = [];
  const after: Date[] = [];
  const before: Date[] = [];
  const presets: PresetType[] = [];

  const handlers: Record<string, (word: string) => void> = {
    'subject:,动画:': (word) => {
      subjects.push(word);
    },
    'title:,标题:,匹配:': (word) => {
      include.push(word);
    },
    '+,include:,包含:': (word) => {
      keywords.push(word);
    },
    '!,！,-,exclude:,排除:': (word) => {
      exclude.push(word);
    },
    'user:,publisher:,发布:,发布者:,发布人:': (word) => {
      publishers.push(word);
    },
    'team:,fansub:,字幕:,字幕组:': (word) => {
      fansubs.push(word);
    },
    '>=,>,after:,开始:,晚于:': (word) => {
      after.push(new Date(word));
    },
    '<=,<,before:,结束:,早于:': (word) => {
      before.push(new Date(word));
    },
    'type:,类型:': (word) => {
      types.push(word);
    },
    'preset:,预设:': (word) => {
      for (const [key, name] of Object.entries(PRESET_DISPLAY_NAME)) {
        if (name === word || name === key) {
          presets.push(key as PresetType);
          break;
        }
      }
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
      search.push(word.replace(/\+/g, '%2b'));
    }
  }

  if (include.length > 0 || keywords.length > 0 || exclude.length > 0) {
    include.push(...search);
    search.splice(0, search.length);
  }

  return {
    search,
    include,
    keywords,
    exclude,
    subjects,
    publishers,
    fansubs,
    after: after.at(-1),
    before: before.at(-1),
    types,
    preset: presets.at(-1)
  };
}

export function stringifySearchText(
  search: URLSearchParams,
  subjects: Record<number, Pick<SubjectInfo, 'title'>>
) {
  const { filter } = parseURLSearch(search, { pageSize: 80 });
  const content: string[] = [];

  if (filter.subjects && filter.subjects.length === 1) {
    const name = subjects[filter.subjects[0]]?.title;
    if (name) {
      content.push('动画:' + (name.indexOf(' ') === -1 ? name : `"${name}"`));
    }
  }

  if (filter.search) {
    content.push(...filter.search.map((f) => wrap(f)));
  } else {
    if (filter.include && filter.include.length > 0) {
      content.push(...filter.include.map((f) => '标题:' + wrap(f)));
    }
    if (filter.keywords) {
      content.push(...filter.keywords.map((t) => '包含:' + wrap(t)));
    }
    if (filter.exclude) {
      content.push(...filter.exclude.map((t) => '排除:' + wrap(t)));
    }
  }

  if (filter.publishers) {
    content.push(...filter.publishers.map((f) => '发布者:' + f));
  }
  if (filter.fansubs) {
    content.push(...filter.fansubs.map((f) => '字幕组:' + f));
  }
  if (filter.types) {
    for (const type of filter.types) {
      content.push('类型:' + type);
    }
  }
  if (filter.after) {
    content.push('开始:' + formatDate(filter.after));
  }
  if (filter.before) {
    content.push('结束:' + formatDate(filter.before));
  }
  if (filter.preset) {
    content.push('预设:' + (PRESET_DISPLAY_NAME[filter.preset] ?? filter.preset));
  }

  return content.map((c) => c).join(' ');

  function formatDate(d: Date) {
    const t = d.toISOString();
    if (t.endsWith('T16:00:00.000Z')) return t.replace('T16:00:00.000Z', '');
    return t;
  }

  function wrap(t: string) {
    if (t.indexOf(' ') !== -1) return `"${dewrap(t).replace(/"/g, '\\"')}"`;
    else return dewrap(t);
  }

  function dewrap(t: string) {
    if (t.at(0) === '"' && t.at(-1) === '"') {
      return t.slice(1, t.length - 1);
    } else {
      return t;
    }
  }
}

export async function stringifySearchTextAsync(
  queryClient: QueryClient,
  search: URLSearchParams,
  signal?: AbortSignal
) {
  signal?.throwIfAborted();
  const { filter } = parseURLSearch(search, { pageSize: 80 });
  const subjects = await Promise.all(
    (filter.subjects ?? []).map((id) =>
      queryClient.ensureQueryData(subjectQueryOptions(id, signal))
    )
  );
  signal?.throwIfAborted();

  return stringifySearchText(
    search,
    Object.fromEntries(
      subjects.flatMap(({ subject }) => (subject ? [[subject.id, { title: subject.title }]] : []))
    )
  );
}

export async function resolveSearchURL(
  queryClient: QueryClient,
  search: string,
  signal?: AbortSignal
) {
  signal?.throwIfAborted();
  if (search.startsWith(location.origin)) {
    return search.slice(location.origin.length);
  } else if (search.startsWith(location.host)) {
    return search.slice(location.host.length);
  } else {
    const match = matchDirectDetailURL(search);
    if (match) {
      return `/detail/${match.provider}/${match.providerId}`;
    } else {
      const { subjects, ...parsed } = parseSearchInput(search);
      const subjectIds =
        subjects.length > 0
          ? (
              await queryClient.ensureQueryData(subjectsByNameQueryOptions(subjects, signal))
            ).subjects.map((subject) => subject.id)
          : [];
      const filter: FilterOptions =
        subjects.length > 0 ? { ...parsed, subjects: subjectIds } : parsed; // intention: unresolved subject names intentionally drop the subject filter.
      signal?.throwIfAborted();

      const searchParams = stringifyURLSearch(filter);
      if (searchParams.size === 1 && searchParams.get('subject')) {
        return `/subject/${searchParams.get('subject')}`;
      } else {
        return `/resources/1?${searchParams.toString()}`;
      }
    }
  }
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
