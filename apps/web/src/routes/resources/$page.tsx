import { createFileRoute, redirect, useLocation } from '@tanstack/react-router';
import { useSuspenseQuery, type QueryClient } from '@tanstack/react-query';
import { parseURLSearch, stringifyURLSearch } from '@animegarden/client';

import Page from '~/pages/resources.($page)/route';
import { APP_HOST } from '~build/env';
import { stringifySearch } from '~/layouts/Search/utils';
import { generateTitleFromFilter } from '~/utils/server/meta';
import { calendarQueryOptions, resourcesQueryOptions } from '~/query';
import { getCanonicalURL, getFeedURL, getTrackingError, serializeError } from '~/utils';
import { ResponseCacheControl, setCacheControl, setErrorResponse } from '~/utils/response';

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

const loader = async ({
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

  const { queryInput } = getResourcesQueryInput(url, page);
  const [{ ok, resources, pagination, filter, timestamp, error }] = await Promise.all([
    context.queryClient.ensureQueryData(resourcesQueryOptions(queryInput)),
    context.queryClient.ensureQueryData(calendarQueryOptions())
  ]);

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
    page,
    filter,
    timestamp,
    error: serializeError(error)
  };
};

export const Route = createFileRoute('/resources/$page')({
  loader,
  head: ({ loaderData }) => {
    const title = generateTitleFromFilter(loaderData?.filter ?? {});
    const search = stringifyURLSearch(loaderData?.filter ?? {});

    return {
      meta: [
        { title: title + ' | Anime Garden 動漫花園資源網镜像站 动漫花园动画 BT 资源聚合站' },
        {
          name: 'description',
          content: `最新资源 ${stringifySearch(search)}`
        }
      ],
      links: [
        {
          rel: 'canonical',
          href: getCanonicalURL(`/resources/${loaderData?.page ?? 1}`, search.toString())
        }
      ]
    };
  },
  component: ResourcesRoute
});

function ResourcesRoute() {
  const location = useLocation();
  const { page } = Route.useLoaderData();
  const url = new URL(location.href, `https://${APP_HOST}`);
  const { queryInput } = getResourcesQueryInput(url, page);
  const { data } = useSuspenseQuery(resourcesQueryOptions(queryInput));
  const pageData = {
    ...data,
    page,
    error: serializeError(data.error)
  };

  return (
    <Page
      data={pageData}
      feedURL={getFeedURL(location.searchStr)}
      path={`${location.pathname}${location.searchStr}`}
      link={(page) => `/resources/${page}${location.searchStr}`}
      renderError={getTrackingError(pageData.error, 'resources-render-failed')}
    />
  );
}
