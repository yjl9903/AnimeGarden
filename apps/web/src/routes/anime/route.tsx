import { createFileRoute, redirect } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';

import { calendarsQueryOptions } from '~/query';
import { setErrorResponse } from '~/utils/response';

const loader = async ({ context }: { context: { queryClient: QueryClient } }) => {
  const { calendars, ok } = await context.queryClient.ensureQueryData(calendarsQueryOptions());
  const season = calendars.find((calendar) => calendar.is_active)?.season;

  if (!ok || !season) {
    await setErrorResponse(500);
    return;
  }

  throw redirect({ href: `/calendar/${season}` });
};

export const Route = createFileRoute('/anime')({
  loader
});
