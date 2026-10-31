import { type QueryClient } from '@tanstack/react-query';
import { createFileRoute, useLocation } from '@tanstack/react-router';

import { parseURLSearch } from '@animegarden/client';

import { APP_HOST } from '~build/env';

import Page from '~/pages/resources.($page)/route';
import { buildResourcesPageHead } from '~/pages/resources.($page)/seo';
import {
  flattenResourcePages,
  loadResourceList,
  useResourceList,
  subjectQueryOptions,
  type ResourcesQueryInput
} from '~/query';
import { getFeedURL, getTrackingError, serializeError } from '~/utils';
import { toResourcesRouterSearch, type RouterSearch } from '~/utils/routes';
import { ResponseCacheControl, setCacheControl, setErrorResponse } from '~/utils/response';

export const loader = async ({
  context,
  location
}: {
  context: { queryClient: QueryClient };
  location: { href: string; state?: unknown };
}) => {
  const url = new URL(location.href, `https://${APP_HOST}`);
  const requestedFilter = {
    ...parseURLSearch(url.searchParams).filter,
    limit: 30
  } satisfies ResourcesQueryInput;

  const [infiniteData, subjectResponses] = await Promise.all([
    loadResourceList(context.queryClient, requestedFilter),
    Promise.all(
      (requestedFilter.subjects ?? []).map((id) =>
        context.queryClient.query(subjectQueryOptions(id))
      )
    )
  ]);
  const data = flattenResourcePages(infiniteData);

  if (data.error) console.error(location.href, data.error);
  if (!data.ok) await setErrorResponse(500);
  else await setCacheControl(ResponseCacheControl.List);

  return {
    ...data,
    filter: requestedFilter,
    subjects: Object.fromEntries(
      subjectResponses.flatMap(({ subject }) => (subject ? [[subject.id, subject]] : []))
    ),
    error: serializeError(data.error)
  };
};

export const Route = createFileRoute('/resources/')({
  loaderDeps: ({ search }) => toResourcesRouterSearch(search as RouterSearch),
  loader,
  head: ({ loaderData }) =>
    buildResourcesPageHead(
      loaderData?.filter,
      loaderData?.subjects,
      loaderData?.resources ? loaderData.resources.length > 0 : undefined
    ),
  component: ResourcesRoute
});

function ResourcesRoute() {
  const location = useLocation();
  const loaderData = Route.useLoaderData();
  const query = useResourceList(loaderData.filter);
  const data = query.data;
  // Keep prior pages visible and let the load-more control offer a retry.
  const error = data.error ?? query.error;

  return (
    <Page
      data={{ ...data, error: serializeError(error) }}
      feedURL={getFeedURL(location.searchStr)}
      path={`${location.pathname}${location.searchStr}`}
      isLoadingMore={query.isFetchingNextPage}
      onLoadMore={query.fetchNextPage}
      renderError={getTrackingError(error, 'resources-render-failed')}
    />
  );
}
