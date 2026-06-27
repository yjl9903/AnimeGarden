import { createFileRoute, useLocation } from '@tanstack/react-router';
import { useSuspenseQuery, type QueryClient } from '@tanstack/react-query';
import { parseURLSearch, stringifyURLSearch } from '@animegarden/client';

import Page from '~/pages/iframe/route';
import { APP_HOST } from '~build/env';
import { stringifySearchText } from '~/layouts/Search/utils';
import { generateTitleFromFilter } from '~/utils/server/meta';
import { calendarQueryOptions, resourcesQueryOptions, subjectQueryOptions } from '~/query';
import { getCanonicalURL, getTrackingError, serializeError } from '~/utils';
import { ResponseCacheControl, setCacheControl, setErrorResponse } from '~/utils/response';

function getIframeQueryInput(url: URL) {
  const { filter: parsedFilter, pagination: parsedPagination } = parseURLSearch(url.searchParams);

  return {
    parsedFilter,
    queryInput: {
      ...parsedFilter,
      ...parsedPagination,
      pageSize: 30
    }
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
  const { parsedFilter, queryInput } = getIframeQueryInput(url);

  const [{ ok, resources, pagination, filter, timestamp, error }, , subjectResponses] =
    await Promise.all([
      context.queryClient.ensureQueryData(resourcesQueryOptions(queryInput)),
      context.queryClient.ensureQueryData(calendarQueryOptions()),
      Promise.all(
        (parsedFilter.subjects ?? []).map((id) =>
          context.queryClient.ensureQueryData(subjectQueryOptions(id))
        )
      )
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
    subjects: Object.fromEntries(
      subjectResponses.flatMap(({ subject }) => (subject ? [[subject.id, subject]] : []))
    ),
    timestamp,
    error: serializeError(error)
  };
};

export const Route = createFileRoute('/iframe')({
  loader,
  head: ({ loaderData }) => {
    const title = generateTitleFromFilter(loaderData?.filter ?? {}, loaderData?.subjects ?? {});
    const search = stringifyURLSearch(loaderData?.filter ?? {});

    return {
      meta: [
        { title: title + ' | Anime Garden 動漫花園資源網第三方镜像站' },
        {
          name: 'description',
          content: `最新资源 ${stringifySearchText(search, loaderData?.subjects ?? {})}`
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
  const { queryInput } = getIframeQueryInput(url);
  const { data } = useSuspenseQuery(resourcesQueryOptions(queryInput));
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
