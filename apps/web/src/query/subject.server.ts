import type { FullSubject } from 'bgmd';
import type { CalendarSubject, DatabaseSubject } from 'bgmx/client';

import { fetchCalendar, fetchCalendars, fetchSubject, fetchSubjects } from 'bgmx/client';

import type { WebBgmSubject } from '~/utils/subject';

import { ResponseStaleTime } from '~/utils/response';
import { getSubjectPosterURL } from '~/utils/subject';

type BgmSubject = DatabaseSubject | CalendarSubject;

export type SubjectLookupResult =
  { ok: true; subject: WebBgmSubject } | { ok: false; code: 'NOT_FOUND'; subject: undefined };

type CacheItem<T> = {
  expires: number;
  value: Promise<T>;
};

const SubjectCache = new Map<string, CacheItem<unknown>>();
const MaxCacheSize = 1024;
const MaxSearchResults = 100;

function normalizeTexts(texts: string[]) {
  return [...new Set(texts.map((text) => text.trim()).filter(Boolean))];
}

function getCached<T>(key: string, ttl: number, fetcher: () => Promise<T>) {
  const now = Date.now();
  const cached = SubjectCache.get(key);
  if (cached && cached.expires > now) {
    SubjectCache.delete(key);
    SubjectCache.set(key, cached);
    return cached.value as Promise<T>;
  }

  const value = fetcher().catch((error) => {
    SubjectCache.delete(key);
    throw error;
  });
  SubjectCache.set(key, { expires: now + ttl, value });

  while (SubjectCache.size > MaxCacheSize) {
    const key = SubjectCache.keys().next().value;
    if (!key) break;
    SubjectCache.delete(key);
  }

  return value;
}

function getDisplayTitle(subject: BgmSubject) {
  return subject.alias.zh?.[0] || subject.title;
}

function transformBgmSubject(subject: BgmSubject): WebBgmSubject {
  const displayTitle = getDisplayTitle(subject);

  return {
    id: subject.id,
    title: subject.title,
    display_title: displayTitle,
    platform: subject.bangumi.platform,
    onair_date: subject.onair_date || subject.bangumi.date,
    poster: subject.poster || subject.bangumi.images.large ? getSubjectPosterURL(subject.id) : '',
    summary: subject.bangumi.summary,
    alias: subject.alias,
    tags: [...new Set([...(subject.bangumi.meta_tags ?? []), ...(subject.bangumi.tags ?? [])])],
    search: subject.search
  };
}

function transformBgmdSubject(subject: FullSubject): WebBgmSubject {
  return {
    id: subject.id,
    title: subject.title,
    display_title: subject.title,
    platform: subject.platform,
    onair_date: subject.onair_date,
    poster: subject.poster ? getSubjectPosterURL(subject.id) : '',
    summary: subject.summary ?? '',
    alias: subject.alias,
    tags: subject.tags,
    search: {
      ...subject.search,
      include: normalizeTexts([
        subject.title,
        ...Object.values(subject.alias).flat(),
        ...subject.search.include
      ])
    }
  };
}

async function getFallbackSubjectById(subjectId: number) {
  const { default: bgmd } = await import('bgmd/full');
  const subject = bgmd.subjects.find((subject) => subject.id === subjectId) as
    FullSubject | undefined;
  return subject ? transformBgmdSubject(subject) : undefined;
}

/** Loads a Subject while preserving the difference between absence and upstream failure. */
export async function getSubjectByIdResult(subjectId: number): Promise<SubjectLookupResult> {
  return getCached(`subject:${subjectId}`, ResponseStaleTime.Subject, async () => {
    try {
      const { subject } = await fetchSubject(subjectId, {
        timeout: 10 * 1000,
        retry: 1
      });
      return { ok: true, subject: transformBgmSubject(subject) } as const;
    } catch (error) {
      console.error('[BGM]', 'fetchSubject fallback bgmd/full', subjectId, error);
      const fallback = await getFallbackSubjectById(subjectId);
      if (fallback) return { ok: true, subject: fallback } as const;
      if (getHTTPStatus(error) === 404) {
        return { ok: false, code: 'NOT_FOUND', subject: undefined } as const;
      }
      throw error;
    }
  });
}

/** Loads optional Subject metadata without making its consumers fail on an upstream outage. */
export async function getSubjectById(subjectId: number) {
  try {
    const result = await getSubjectByIdResult(subjectId);
    return result.ok ? result.subject : undefined;
  } catch {
    return undefined;
  }
}

function getHTTPStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;

  const response = 'response' in error ? error.response : undefined;
  if (response && typeof response === 'object' && 'status' in response) {
    return typeof response.status === 'number' ? response.status : undefined;
  }

  return 'cause' in error ? getHTTPStatus(error.cause) : undefined;
}

export async function searchSubjects(keyword: string, limit?: number) {
  const normalizedKeyword = keyword.trim();
  if (!normalizedKeyword) return [];

  const subjects = await getCached(
    `search:${normalizedKeyword}`,
    ResponseStaleTime.Subject,
    async () => {
      const result: WebBgmSubject[] = [];
      for await (const subject of fetchSubjects({
        q: normalizedKeyword,
        timeout: 10 * 1000,
        retry: 1
      })) {
        result.push(transformBgmSubject(subject));
        if (result.length >= MaxSearchResults) break;
      }
      return result;
    }
  );

  return limit === undefined ? subjects : subjects.slice(0, Math.min(limit, MaxSearchResults));
}

function getSubjectNames(subject: WebBgmSubject) {
  return normalizeTexts([
    subject.display_title ?? '',
    subject.title,
    ...Object.values(subject.alias).flat(),
    ...subject.search.include
  ]);
}

function isSubjectNameMatch(subject: WebBgmSubject, name: string) {
  const normalizedName = name.trim();
  return getSubjectNames(subject).some((candidate) => candidate === normalizedName);
}

export async function resolveSubjectsByName(names: string[]) {
  return (
    await Promise.all(
      normalizeTexts(names).map(async (name) =>
        (await searchSubjects(name)).filter((subject) => isSubjectNameMatch(subject, name))
      )
    )
  ).flat();
}

export async function resolveSubjectByName(name: string) {
  return (await resolveSubjectsByName([name]))[0];
}

export async function getCalendars() {
  return getCached('calendars', ResponseStaleTime.Calendar, () =>
    fetchCalendars({
      timeout: 10 * 1000,
      retry: 1
    })
  );
}

export async function getCalendar(season: string) {
  return getCached(`calendar:${season}`, ResponseStaleTime.Calendar, async () => {
    const { calendar } = await fetchCalendar({
      seasons: [season],
      timeout: 10 * 1000,
      retry: 1
    });
    return calendar.map((subjects) => subjects.map(transformBgmSubject));
  });
}

export async function getLatestCalendar() {
  const season = [...(await getCalendars())]
    .filter((calendar) => calendar.is_active)
    .sort((lhs, rhs) => rhs.season.localeCompare(lhs.season))[0]?.season;

  return {
    season,
    calendar: season ? await getCalendar(season) : []
  };
}
