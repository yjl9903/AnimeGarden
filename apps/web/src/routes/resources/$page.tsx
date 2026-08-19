import { createFileRoute, redirect, useLocation } from '@tanstack/react-router';
import { useSuspenseQuery, type QueryClient } from '@tanstack/react-query';
import { parseURLSearch, stringifyURLSearch } from '@animegarden/client';

import Page from '~/pages/resources.($page)/route';
import { buildResourcesPageHead } from '~/pages/resources.($page)/seo';
import { APP_HOST } from '~build/env';
import { calendarQueryOptions, resourcesQueryOptions, subjectQueryOptions } from '~/query';
import { getFeedURL, getTrackingError, serializeError } from '~/utils';
import { getResourcesRouteLink } from '~/utils/routes';
import { ResponseCacheControl, setCacheControl, setErrorResponse } from '~/utils/response';

const deepPaginationMessage = 'Resources pagination is too deep.';

function getResourcesQueryInput(url: URL, page: number) {
  const { filter: parsedFilter, pagination: parsedPagination } = parseURLSearch(url.searchParams, {
    pageSize: 80
  });

  return {
    parsedFilter,
    queryInput: {
      ...parsedFilter,
      ...parsedPagination,
      page,
      pageSize: 30
    }
  };
}

export const loader = async ({
  context,
  location,
  params
}: {
  context: { queryClient: QueryClient };
  location: { href: string };
  params: { page?: string };
}) => {
  const url = new URL(location.href, `https://${APP_HOST}`);

  const page = Math.floor(+(params.page ?? '1'));
  if (page <= 0) {
    url.pathname = url.pathname.replace(/\/-?\d+(\.\d*)?$/, '/1');
    throw redirect({ href: `${url.pathname}${url.search}` });
  }

  const { parsedFilter, queryInput } = getResourcesQueryInput(url, page);
  const [{ ok, resources, pagination, filter, timestamp, error }, calendar, subjectResponses] =
    await Promise.all([
      context.queryClient.ensureQueryData(resourcesQueryOptions(queryInput)),
      context.queryClient.ensureQueryData(calendarQueryOptions()),
      Promise.all(
        (parsedFilter.subjects ?? []).map((id) =>
          context.queryClient.ensureQueryData(subjectQueryOptions(id))
        )
      )
    ]);

  const isDeepPagination = !ok && error?.message?.includes(deepPaginationMessage);
  if (error && !isDeepPagination) {
    console.error(location.href, error);
  }

  if (isDeepPagination) {
    throw redirect({
      href: calendar.ok && calendar.season ? `/calendar/${calendar.season}` : '/anime'
    });
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
    page,
    filter,
    subjects: Object.fromEntries(
      subjectResponses.flatMap(({ subject }) => (subject ? [[subject.id, subject]] : []))
    ),
    timestamp,
    error: serializeError(error)
  };
};

export const Route = createFileRoute('/resources/$page')({
  loader,
  head: ({ loaderData }) =>
    buildResourcesPageHead(
      loaderData?.filter,
      loaderData?.subjects,
      loaderData?.page ?? 1,
      loaderData?.resources ? loaderData.resources.length > 0 : undefined
    ),
  component: ResourcesRoute
});

function ResourcesRoute() {
  const location = useLocation();
  const { page, filter } = Route.useLoaderData();
  const url = new URL(location.href, `https://${APP_HOST}`);
  const { queryInput } = getResourcesQueryInput(url, page);
  const { data } = useSuspenseQuery(resourcesQueryOptions(queryInput));
  const pageData = {
    ...data,
    page,
    error: serializeError(data.error)
  };
  const normalizedSearch = stringifyURLSearch(filter ?? {}).toString();
  const normalizedSearchStr = normalizedSearch ? `?${normalizedSearch}` : '';

  return (
    <Page
      data={pageData}
      feedURL={getFeedURL(normalizedSearchStr)}
      path={`${location.pathname}${location.searchStr}`}
      link={(page) => getResourcesRouteLink(page, normalizedSearchStr)}
      renderError={getTrackingError(pageData.error, 'resources-render-failed')}
    />
  );
}
