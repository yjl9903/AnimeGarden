import { getSubjectById, getSubjectByName } from '@/utils/subjects';
import { parseURLSearch, stringifyURLSearch } from '@animegarden/client';

export const DMHY_RE = /(?:https:\/\/share.dmhy.org\/topics\/view\/)?(\d+_[a-zA-Z0-9_\-]+\.html)/;

export function parseSearch(input: string) {
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
    'publisher:,发布:,发布者:发布人:': (word) => {
      publishers.push(word);
    },
    'fansub:,字幕:,字幕组:': (word) => {
      fansubs.push(word);
    },
    'after:,开始:,晚于:': (word) => {
      after.push(new Date(word));
    },
    'before:,结束:,早于:': (word) => {
      before.push(new Date(word));
    },
    'type:,类型:': (word) => {
      types.push(word);
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

  // Map from subject name -> subject id
  const subjectIds = [];
  if (subjects.length > 0) {
    for (const subject of subjects) {
      const bgm = getSubjectByName(subject);
      if (bgm) {
        subjectIds.push(bgm.id);
      }
    }
  }

  return {
    search,
    include,
    keywords,
    exclude,
    subjects: subjectIds,
    publishers,
    fansubs,
    after: after.at(-1),
    before: before.at(-1),
    types
  };
}

export function stringifySearch(search: URLSearchParams) {
  const filter = parseURLSearch(search, { pageSize: 80 });
  const content: string[] = [];

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

  if (filter.subjects && filter.subjects.length === 1) {
    const bgm = getSubjectById(filter.subjects[0]);
    content.push('动画:' + (bgm?.bangumi?.name_cn || bgm?.name));
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

export function resolveSearchURL(search: string) {
  if (search.startsWith(location.origin)) {
    return search.slice(location.origin.length);
  } else if (search.startsWith(location.host)) {
    return search.slice(location.host.length);
  } else {
    const match = DMHY_RE.exec(search);
    if (match) {
      return `/detail/dmhy/${match[1]}`;
    } else {
      const searchParams = stringifyURLSearch(parseSearch(search));
      return `/resources/1?${searchParams.toString()}`;
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
