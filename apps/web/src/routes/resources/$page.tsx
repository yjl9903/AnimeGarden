import { createFileRoute, redirect, useLocation } from '@tanstack/react-router';
import { parseURLSearch, stringifyURLSearch } from '@animegarden/client';

import Page from '~/pages/resources.($page)/route';
import { APP_HOST } from '~build/env';
import { stringifySearch } from '~/layouts/Search/utils';
import { generateTitleFromFilter } from '~/utils/server/meta';
import {
  fetchResources,
  getCanonicalURL,
  getFeedURL,
  getTrackingError,
  serializeError
} from '~/utils';
import { setResponseStatus } from '~/utils/response';

const loader = async ({
  location,
  params
}: {
  location: { href: string };
  params: { page?: string };
}) => {
  const url = new URL(location.href, `https://${APP_HOST}`);

  const page = Math.floor(+(params.page ?? '1'));
  if (page <= 0) {
    url.pathname = url.pathname.replace(/\/-?\d+(\.\d*)?$/, '/1');
    throw redirect({ href: `${url.pathname}${url.search}` });
  }

  const { filter: parsedFilter, pagination: parsedPagination } = parseURLSearch(url.searchParams, {
    pageSize: 80
  });
  try {
    const { ok, resources, pagination, filter, timestamp, error } = await fetchResources({
      ...parsedFilter,
      ...parsedPagination,
      page: +(params.page ?? '1'),
      pageSize: 30
    });

    if (error) {
      console.error(location.href, error);
    }

    if (!ok) {
      await setResponseStatus(500);
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
  } catch (error) {
    console.error(location.href, error);
    await setResponseStatus(500);

    return {
      ok: false,
      resources: [],
      pagination: undefined,
      page,
      filter: parsedFilter,
      timestamp: undefined,
      error: serializeError(error)
    };
  }
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
  const data = Route.useLoaderData();

  return (
    <Page
      data={data}
      feedURL={getFeedURL(location.searchStr)}
      path={`${location.pathname}${location.searchStr}`}
      link={(page) => `/resources/${page}${location.searchStr}`}
      renderError={getTrackingError(data.error, 'resources-render-failed')}
    />
  );
}
