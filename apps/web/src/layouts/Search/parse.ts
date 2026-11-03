import type { PresetType } from '@animegarden/client';

import { PRESET_DISPLAY_NAME } from '../../utils/constants';

/** Filters parsed from the site's human search syntax. */
export interface SearchInputResult {
  search: string[];
  include: string[];
  keywords: string[];
  exclude: string[];
  subjects: string[];
  publishers: string[];
  fansubs: string[];
  after?: Date;
  before?: Date;
  types: string[];
  preset?: PresetType;
}

/** Decode search words while retaining their original quoting for filter rewrites. */
function splitWords(search: string) {
  const matchQuotes = {
    '"': ['"'],
    "'": ["'"],
    '“': ['”'],
    '”': ['“']
  };

  const words: { value: string; raw: string }[] = [];
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

    words.push({ value: word, raw: search.slice(i, j) });
    i = j;
  }
  return words;
}

/**
 * Parse the site's human search syntax into filter options.
 *
 * The syntax is documented on the website: plain words are full-text search,
 * `+word` requires a keyword, `-word` excludes, and prefix operators such as
 * `字幕组:`, `发布者:`, `类型:`, `标题:`, `开始:`, `结束:`, `预设:` restrict the
 * corresponding filter groups. Words can be quoted to keep spaces.
 *
 * @param input - raw search box text.
 * @returns parsed filter groups; unknown operators fall back to full-text terms.
 */
export function parseSearchInput(input: string): SearchInputResult {
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

  for (const { value: word } of splitted) {
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

/** Filter groups that can be set together in search text. */
export type SearchFilters = Partial<Pick<SearchInputResult, 'subjects' | 'fansubs' | 'types'>>;

/**
 * Set the supplied filter groups, recognizing every alias accepted by the parser.
 * Omitted or undefined fields stay unchanged; an empty array clears a group.
 * Preserve unrelated words verbatim, including their quoting and escapes.
 */
export function setSearchFilters(input: string, filters: SearchFilters): string {
  const keywords: Record<keyof SearchFilters, string> = {
    subjects: '动画',
    fansubs: '字幕组',
    types: '类型'
  };
  const groups = (Object.keys(keywords) as (keyof SearchFilters)[]).filter(
    (group) => filters[group] !== undefined
  );
  if (groups.length === 0) return input;

  // Parse each existing token once, removing only the groups being set.
  const remaining = splitWords(input)
    .filter(({ raw }) => {
      const parsed = parseSearchInput(raw);
      return groups.every((group) => parsed[group].length === 0);
    })
    .map(({ raw }) => raw);
  const tokens = groups.flatMap((group) =>
    (filters[group] ?? []).map(
      (value) => `${keywords[group]}:"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
    )
  );
  return [...remaining, ...tokens].join(' ');
}
