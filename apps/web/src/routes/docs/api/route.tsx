import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery, type QueryClient } from '@tanstack/react-query';

import Page from '~/pages/docs.api/route';
import { buildDocsApiPageHead } from '~/pages/docs.api/seo';
import { calendarQueryOptions, timestampQueryOptions } from '~/query';
import { ResponseCacheControl, setCacheControl, setErrorResponse } from '~/utils/response';

const loader = async ({ context }: { context: { queryClient: QueryClient } }) => {
  const [data] = await Promise.all([
    context.queryClient.ensureQueryData(timestampQueryOptions()),
    context.queryClient.ensureQueryData(calendarQueryOptions())
  ]);
  if (data.ok) {
    await setCacheControl(ResponseCacheControl.Docs);
  } else {
    await setErrorResponse(500);
  }

  return data;
};

export const Route = createFileRoute('/docs/api')({
  loader,
  head: () => buildDocsApiPageHead(),
  component: DocsApiRoute
});

function DocsApiRoute() {
  const { data } = useSuspenseQuery(timestampQueryOptions());
  const { timestamp } = data;
  return <Page timestamp={timestamp} />;
}
