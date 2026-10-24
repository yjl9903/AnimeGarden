import { fetchCalendar, fetchCalendars, fetchSubject, fetchSubjects } from 'bgmx/client';

import { getHTTPStatus, transformBgmSubject } from '@animegarden/shared';

import type { WebBgmSubject } from '~/utils/subject';

import { ResponseStaleTime } from '~/utils/response';

export type SubjectLookupResult =
  { ok: true; subject: WebBgmSubject } | { ok: false; code: 'NOT_FOUND'; subject: undefined };

type CacheItem<T> = {
  expires: number;
  value: Promise<T>;
  successful?: T;
};

const SubjectCache = new Map<string, CacheItem<unknown>>();
const MaxCacheSize = 1024;
const MaxSearchResults = 100;

function normalizeTexts(texts: string[]) {
  return [...new Set(texts.map((text) => text.trim()).filter(Boolean))];
}

/** Cache successful dynamic responses and retry outages after one minute using the last success. */
function getCached<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>,
  canUseStale: (value: T) => boolean = () => true
): Promise<T> {
  const now = Date.now();
  const cached = SubjectCache.get(key) as CacheItem<T> | undefined;
  if (cached && cached.expires > now) {
    SubjectCache.delete(key);
    SubjectCache.set(key, cached);
    return cached.value;
  }

  const entry: CacheItem<T> = {
    expires: now + ttl,
    value: Promise.resolve()
      .then(fetcher)
      .then((value) => {
        entry.successful = value;
        return value;
      })
      .catch((error) => {
        // A definitive 404 must not resurrect a removed subject or season.
        if (
          getHTTPStatus(error) !== 404 &&
          cached?.successful !== undefined &&
          canUseStale(cached.successful)
        ) {
          console.warn('[BGM]', 'Serving last successful response', key, error);
          entry.expires = Date.now() + 60_000;
          entry.successful = cached.successful;
          return cached.successful;
        }
        if (SubjectCache.get(key) === entry) SubjectCache.delete(key);
        throw error;
      })
  };
  // Renew recency on an expired lookup as well as on a fresh cache hit.
  SubjectCache.delete(key);
  SubjectCache.set(key, entry);

  while (SubjectCache.size > MaxCacheSize) {
    const oldest = SubjectCache.keys().next().value;
    if (!oldest) break;
    SubjectCache.delete(oldest);
  }

  return entry.value;
}

/** Loads a Subject while preserving the difference between absence and upstream failure. */
export async function getSubjectByIdResult(subjectId: number): Promise<SubjectLookupResult> {
  return getCached(
    `subject:${subjectId}`,
    ResponseStaleTime.Subject,
    async () => {
      try {
        const { subject } = await fetchSubject(subjectId, {
          timeout: 10 * 1000,
          retry: 1
        });
        return { ok: true, subject: transformBgmSubject(subject) } as const;
      } catch (error) {
        if (getHTTPStatus(error) === 404) {
          return { ok: false, code: 'NOT_FOUND', subject: undefined } as const;
        }
        throw error;
      }
    },
    (result) => result.ok
  );
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

/** Loads seven weekday buckets followed by the season’s standalone WEB bucket. */
export async function getCalendar(season: string) {
  return getCached(`calendar:${season}`, ResponseStaleTime.Calendar, async () => {
    const { calendar, web } = await fetchCalendar({
      seasons: [season],
      timeout: 10 * 1000,
      retry: 1
    });
    // Keep WEB separate from weekday scheduling, including batch releases without a weekday.
    return [...calendar, web].map((subjects) => subjects.map(transformBgmSubject));
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
