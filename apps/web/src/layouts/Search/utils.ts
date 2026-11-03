import {
  type FilterOptions,
  type PresetType,
  parseURLSearch,
  stringifyURLSearch
} from '@animegarden/client';
import type { QueryClient } from '@tanstack/react-query';

import { PRESET_DISPLAY_NAME } from '../../utils/constants';
import { getSubjectDisplayName, type SubjectInfo } from '../../utils/subject';
import { subjectQueryOptions, subjectsByNameQueryOptions } from '../../query/subject';

import { parseSearchInput } from './parse';

export { parseSearchInput };

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

export function stringifySearchText(
  search: URLSearchParams,
  subjects: Record<number, Pick<SubjectInfo, 'title' | 'display_title'>>
) {
  const { filter } = parseURLSearch(search, { pageSize: 80 });
  const content: string[] = [];

  if (filter.subjects && filter.subjects.length === 1) {
    const name = getSubjectDisplayName(subjects[filter.subjects[0]]);
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
      subjects.flatMap(({ subject }) =>
        subject
          ? [[subject.id, { title: subject.title, display_title: subject.display_title }]]
          : []
      )
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
