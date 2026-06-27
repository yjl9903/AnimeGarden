import { createFileRoute, useLocation } from '@tanstack/react-router';
import { parseURLSearch, stringifyURLSearch } from '@animegarden/client';

import Page from '~/pages/iframe/route';
import { APP_HOST } from '~build/env';
import { stringifySearch } from '~/layouts/Search/utils';
import { generateTitleFromFilter } from '~/utils/server/meta';
import { fetchResources, getCanonicalURL, getTrackingError, serializeError } from '~/utils';

const loader = async ({ location }: { location: { href: string } }) => {
  const url = new URL(location.href, `https://${APP_HOST}`);

  const { filter: parsedFilter, pagination: parsedPagination } = parseURLSearch(url.searchParams);
  const { ok, resources, pagination, filter, timestamp, error } = await fetchResources({
    ...parsedFilter,
    ...parsedPagination,
    pageSize: 30
  });

  if (error) {
    console.error(location.href, error);
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
  const data = Route.useLoaderData();

  return (
    <Page
      data={data}
      searchStr={location.searchStr}
      path={`${location.pathname}${location.searchStr}`}
      renderError={getTrackingError(data.error, 'iframe-render-failed')}
    />
  );
}
