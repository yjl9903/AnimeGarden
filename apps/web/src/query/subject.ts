import { createServerFn } from '@tanstack/react-start';
import { queryOptions, type QueryClient } from '@tanstack/react-query';

import type { FullSubject } from 'bgmd';

import {
  ResponseCacheControl,
  ResponseStaleTime,
  setCacheControl,
  setErrorResponse
} from '../utils/response';

import {
  getCalendar,
  getSubjectById,
  resolveSubjectByName,
  searchSubjects
} from './subject.server';

type SubjectsResponse = {
  ok: boolean;
  subjects: FullSubject[];
};

type SubjectResponse = {
  ok: boolean;
  subject?: FullSubject;
};

const fetchCalendarFn = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    await setCacheControl(ResponseCacheControl.Calendar);
    return { ok: true, calendar: await getCalendar() };
  } catch (error) {
    console.error('[API]', 'fetchCalendar', error);
    await setErrorResponse();
    return { ok: false, calendar: [] };
  }
});

export function calendarQueryOptions() {
  return queryOptions({
    queryKey: ['api', 'calendar'] as const,
    queryFn: ({ signal }) => fetchCalendarFn({ signal }),
    staleTime: ResponseStaleTime.Calendar
  });
}

const fetchSubjectFn = createServerFn({ method: 'GET' })
  .validator((subjectId: number) => subjectId)
  .handler(async ({ data: subjectId }) => {
    try {
      const subject = await getSubjectById(subjectId);
      if (subject) {
        await setCacheControl(ResponseCacheControl.Subject);
        return { ok: true, subject };
      }

      return { ok: false, subject: undefined };
    } catch (error) {
      console.error('[API]', 'fetchSubject', subjectId, error);
      await setErrorResponse();
      return { ok: false, subject: undefined };
    }
  });

export function subjectQueryOptions(subjectId: number, externalSignal?: AbortSignal) {
  return queryOptions({
    queryKey: ['api', 'subject', subjectId] as const,
    queryFn: ({ signal }) =>
      fetchSubjectFn({
        data: subjectId,
        signal: externalSignal ? AbortSignal.any([signal, externalSignal]) : signal
      }),
    staleTime: ResponseStaleTime.Subject
  });
}

const fetchSubjectByNameFn = createServerFn({ method: 'GET' })
  .validator((name: string) => name.trim())
  .handler(async ({ data: name }): Promise<SubjectResponse> => {
    try {
      await setCacheControl(ResponseCacheControl.Subject);
      return { ok: true, subject: await resolveSubjectByName(name) };
    } catch (error) {
      console.error('[API]', 'fetchSubjectByName', name, error);
      await setErrorResponse();
      return { ok: false };
    }
  });

function subjectByNameQueryOptions(name: string, externalSignal?: AbortSignal) {
  return queryOptions({
    queryKey: ['api', 'subject', 'name', name] as const,
    queryFn: async ({ signal, client }) => {
      const resp = await fetchSubjectByNameFn({
        data: name,
        signal: externalSignal ? AbortSignal.any([signal, externalSignal]) : signal
      });
      seedSubjectQueries(client, resp.subject ? [resp.subject] : []);
      return resp;
    },
    staleTime: ResponseStaleTime.Subject
  });
}

export function subjectsByNameQueryOptions(names: string[], externalSignal?: AbortSignal) {
  return queryOptions({
    queryKey: ['api', 'subjects', 'name', normalizeTexts(names)] as const,
    queryFn: async ({ signal, client }) => {
      // These fan out to single-name queries on purpose: search inputs are tiny, and
      // per-name keys get better reuse across URL resolving and repeated input states.
      const responses = await Promise.all(
        normalizeTexts(names).map((name) =>
          client.ensureQueryData(
            subjectByNameQueryOptions(
              name,
              externalSignal ? AbortSignal.any([signal, externalSignal]) : signal
            )
          )
        )
      );
      return {
        ok: responses.every((resp) => resp.ok),
        subjects: responses.flatMap((resp) => resp.subject ?? [])
      };
    },
    staleTime: ResponseStaleTime.Subject
  });
}

const searchSubjectsFn = createServerFn({ method: 'GET' })
  .validator((input: { keyword: string; limit: number }) => ({
    keyword: input.keyword.trim(),
    limit: input.limit
  }))
  .handler(async ({ data: { keyword, limit } }): Promise<SubjectsResponse> => {
    try {
      await setCacheControl(ResponseCacheControl.Subject);
      return { ok: true, subjects: await searchSubjects(keyword, limit) };
    } catch (error) {
      console.error('[API]', 'searchSubjects', keyword, error);
      await setErrorResponse();
      return { ok: false, subjects: [] };
    }
  });

function subjectSearchKeywordQueryOptions(
  keyword: string,
  limit: number,
  externalSignal?: AbortSignal
) {
  return queryOptions({
    queryKey: ['api', 'subjects', 'search', keyword, limit] as const,
    queryFn: async ({ signal, client }) => {
      const resp = await searchSubjectsFn({
        data: { keyword, limit },
        signal: externalSignal ? AbortSignal.any([signal, externalSignal]) : signal
      });
      seedSubjectQueries(client, resp.subjects);
      return resp;
    },
    staleTime: ResponseStaleTime.Subject
  });
}

export function subjectSearchQueryOptions(keywords: string[]) {
  return queryOptions({
    queryKey: ['api', 'subjects', 'search', normalizeTexts(keywords)] as const,
    queryFn: async ({ signal, client }) => {
      // Keep keyword searches individually cached. The N here is bounded by parsed search terms,
      // while single-keyword hits are shared by suggestions across repeated input states.
      const responses = await Promise.all(
        normalizeTexts(keywords).map(
          (keyword) => client.ensureQueryData(subjectSearchKeywordQueryOptions(keyword, 20, signal)) // intention: suggestion-only truncation; move ranking server-side if recall matters.
        )
      );
      return {
        ok: responses.every((resp) => resp.ok),
        subjects: rankSubjectsByKeywordMatches(responses).slice(0, 3)
      };
    },
    staleTime: ResponseStaleTime.Subject
  });
}

function rankSubjectsByKeywordMatches(responses: SubjectsResponse[]) {
  const subjectHits = new Map<number, { subject: FullSubject; count: number }>();

  for (const response of responses) {
    const seen = new Set<number>();
    for (const subject of response.subjects) {
      if (seen.has(subject.id)) continue;
      seen.add(subject.id);

      const hit = subjectHits.get(subject.id);
      if (hit) {
        hit.count++;
      } else {
        subjectHits.set(subject.id, { subject, count: 1 });
      }
    }
  }

  const maxCount = Math.max(0, ...Array.from(subjectHits.values(), ({ count }) => count));

  return Array.from(subjectHits.values())
    .filter(({ count }) => count === maxCount)
    .map(({ subject }) => subject)
    .sort((a, b) => b.id - a.id);
}

function seedSubjectQueries(queryClient: QueryClient, subjects: FullSubject[]) {
  for (const subject of subjects) {
    queryClient.setQueryData(subjectQueryOptions(subject.id).queryKey, { ok: true, subject });
  }
}

function normalizeTexts(texts: string[]) {
  return [...new Set(texts.map((text) => text.trim()).filter(Boolean))];
}
