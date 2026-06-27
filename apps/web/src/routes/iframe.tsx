import { createFileRoute, useLocation } from '@tanstack/react-router';
import { useSuspenseQuery, type QueryClient } from '@tanstack/react-query';
import { parseURLSearch, stringifyURLSearch } from '@animegarden/client';

import Page from '~/pages/iframe/route';
import { APP_HOST } from '~build/env';
import { stringifySearch } from '~/layouts/Search/utils';
import { generateTitleFromFilter } from '~/utils/server/meta';
import { calendarQueryOptions, resourcesQueryOptions } from '~/query';
import { getCanonicalURL, getTrackingError, serializeError } from '~/utils';
import { ResponseCacheControl, setCacheControl, setErrorResponse } from '~/utils/response';

function getIframeQueryInput(url: URL) {
  const { filter: parsedFilter, pagination: parsedPagination } = parseURLSearch(url.searchParams);

  return {
    ...parsedFilter,
    ...parsedPagination,
    pageSize: 30
  };
}

const loader = async ({
  context,
  location
}: {
  context: { queryClient: QueryClient };
  location: { href: string };
}) => {
  const url = new URL(location.href, `https://${APP_HOST}`);

  const [{ ok, resources, pagination, filter, timestamp, error }] = await Promise.all([
    context.queryClient.ensureQueryData(resourcesQueryOptions(getIframeQueryInput(url))),
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
    filter,
    timestamp,
    error: serializeError(error)
  };
};

export const Route = createFileRoute('/iframe')({
  loader,
  head: ({ loaderData }) => {
    const title = generateTitleFromFilter(loaderData?.filter ?? {});
    const search = stringifyURLSearch(loaderData?.filter ?? {});

    return {
      meta: [
        { title: title + ' | Anime Garden 動漫花園資源網第三方镜像站' },
        {
          name: 'description',
          content: `最新资源 ${stringifySearch(search)}`
        }
      ],
      links: [
        {
          rel: 'canonical',
          href: getCanonicalURL(`/iframe`, search.toString())
        }
      ]
    };
  },
  component: IframeRoute
});

function IframeRoute() {
  const location = useLocation();
  const url = new URL(location.href, `https://${APP_HOST}`);
  const { data } = useSuspenseQuery(resourcesQueryOptions(getIframeQueryInput(url)));
  const pageData = {
    ...data,
    error: serializeError(data.error)
  };

  return (
    <Page
      data={pageData}
      searchStr={location.searchStr}
      path={`${location.pathname}${location.searchStr}`}
      renderError={getTrackingError(pageData.error, 'iframe-render-failed')}
    />
  );
}
