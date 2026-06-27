import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';

import {
  ResponseCacheControl,
  ResponseStaleTime,
  setCacheControl,
  setErrorResponse
} from '~/utils/response';

const fetchSubjectFn = createServerFn({ method: 'GET' })
  .validator((subjectId: number) => subjectId)
  .handler(async ({ data: subjectId }) => {
    try {
      const bgmd = await import('bgmd/full');
      const subject = bgmd.default.subjects.find((subject) => subject.id === subjectId);
      if (subject) {
        await setCacheControl(ResponseCacheControl.Subject);
        return { ok: true, subject };
      }

      await setErrorResponse(404);
      return { ok: false, subject: undefined };
    } catch (error) {
      console.error('[API]', 'fetchSubject', subjectId, error);
      await setErrorResponse();
      return { ok: false, subject: undefined };
    }
  });

const fetchCalendarFn = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const bgmd = await import('bgmd/calendar');
    await setCacheControl(ResponseCacheControl.Calendar);
    return { ok: true, calendar: bgmd.calendar };
  } catch (error) {
    console.error('[API]', 'fetchCalendar', error);
    await setErrorResponse();
    return { ok: false, calendar: [] };
  }
});

export function subjectQueryOptions(subjectId: number) {
  return queryOptions({
    queryKey: ['api', 'subject', subjectId] as const,
    queryFn: ({ signal }) => fetchSubjectFn({ data: subjectId, signal }),
    staleTime: ResponseStaleTime.Subject
  });
}

export function calendarQueryOptions() {
  return queryOptions({
    queryKey: ['api', 'calendar'] as const,
    queryFn: ({ signal }) => fetchCalendarFn({ signal }),
    staleTime: ResponseStaleTime.Calendar
  });
}
