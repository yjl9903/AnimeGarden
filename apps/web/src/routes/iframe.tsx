import { createFileRoute, useLocation } from '@tanstack/react-router';
import { type QueryClient } from '@tanstack/react-query';
import { parseURLSearch } from '@animegarden/client';

import Page from '~/pages/iframe/route';
import { buildIframePageHead } from '~/pages/iframe/seo';
import { APP_HOST } from '~build/env';
import { resourcesQueryOptions, subjectQueryOptions, type ResourcesQueryInput } from '~/query';
import { getTrackingError, serializeError } from '~/utils';
import { ResponseCacheControl, setCacheControl, setErrorResponse } from '~/utils/response';
import { toResourcesRouterSearch, type RouterSearch } from '~/utils/routes';

export const loader = async ({
  context,
  location
}: {
  context: { queryClient: QueryClient };
  location: { href: string };
}) => {
  const url = new URL(location.href, `https://${APP_HOST}`);
  const parsed = parseURLSearch(url.searchParams);
  const requestedFilter = {
    ...parsed.filter,
    limit: parsed.pagination.limit
  } satisfies ResourcesQueryInput;

  const [data, subjectResponses] = await Promise.all([
    context.queryClient.query(resourcesQueryOptions(requestedFilter)),
    Promise.all(
      (requestedFilter.subjects ?? []).map((id) =>
        context.queryClient.query(subjectQueryOptions(id))
      )
    )
  ]);
  const { ok, resources, pagination, filter, timestamp, error } = data;

  if (error) {
    console.error(location.href, error);
  }

  if (!ok) {
    await setErrorResponse(500);
  } else {
    await setCacheControl(ResponseCacheControl.List);
  }

  return {
    ok,
    resources,
    pagination,
    filter,
    subjects: Object.fromEntries(
      subjectResponses.flatMap(({ subject }) => (subject ? [[subject.id, subject]] : []))
    ),
    timestamp,
    error: serializeError(error)
  };
};

export const Route = createFileRoute('/iframe')({
  loaderDeps: ({ search }) => ({
    ...toResourcesRouterSearch(search as RouterSearch),
    limit: (search as RouterSearch).limit
  }),
  loader,
  head: ({ loaderData }) => buildIframePageHead(loaderData?.filter, loaderData?.subjects),
  component: IframeRoute
});

function IframeRoute() {
  const location = useLocation();
  const loaderData = Route.useLoaderData();
  // Embeds render only the loader's first batch; no reactive list or scroll continuation.
  return (
    <Page
      data={loaderData}
      searchStr={location.searchStr}
      path={`${location.pathname}${location.searchStr}`}
      renderError={getTrackingError(loaderData.error, 'iframe-render-failed')}
    />
  );
}
