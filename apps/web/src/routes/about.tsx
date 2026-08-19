import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery, type QueryClient } from '@tanstack/react-query';

import Page from '~/pages/about/route';
import { buildAboutPageHead } from '~/pages/about/seo';
import { calendarQueryOptions, timestampQueryOptions } from '~/query';
import { ResponseCacheControl, setCacheControl, setErrorResponse } from '~/utils/response';

const loader = async ({ context }: { context: { queryClient: QueryClient } }) => {
  const [data] = await Promise.all([
    context.queryClient.ensureQueryData(timestampQueryOptions()),
    context.queryClient.ensureQueryData(calendarQueryOptions())
  ]);
  if (data.ok) {
    await setCacheControl(ResponseCacheControl.List);
  } else {
    await setErrorResponse(500);
  }

  return data;
};

export const Route = createFileRoute('/about')({
  loader,
  head: () => buildAboutPageHead(),
  component: AboutRoute
});

function AboutRoute() {
  const { data } = useSuspenseQuery(timestampQueryOptions());
  const { timestamp } = data;
  return <Page timestamp={timestamp} />;
}
