import { useMemo } from 'react';
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { type ClientLoaderFunction, redirect, useLoaderData, useLocation } from '@remix-run/react';

import { parseURLSearch } from '@animegarden/client';

import Layout from '~/layouts/Layout';
import Resources from '~/components/Resources';
import { stringifySearch } from '~/layouts/Search/utils';
import { usePreferFansub } from '~/states';
import { waitForSubjectsLoaded } from '~/utils/subjects';
import { generateTitleFromFilter } from '~/utils/server/meta';
import { fetchResources, getFeedURL } from '~/utils';

import { Error } from './Error';
import { FilterCard } from './Filter';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  // Redirect to the first page
  if (params.page === undefined) {
    if (url.pathname.endsWith('/')) {
      url.pathname += '1';
    } else {
      url.pathname += '/1';
    }
    return redirect(url.toString());
  }

  const page = Math.floor(+(params.page ?? '1'));
  if (page <= 0) {
    url.pathname = url.pathname.replace(/\/-?\d+(\.\d*)?$/, '/1');
    return redirect(url.toString());
  }

  const { filter: parsedFilter, pagination: parsedPagination } = parseURLSearch(url.searchParams, {
    pageSize: 80
  });
  const { ok, resources, pagination, filter, timestamp } = await fetchResources({
    ...parsedFilter,
    ...parsedPagination,
    page: +(params.page ?? '1'),
    pageSize: 30
  });

  return {
    ok,
    resources,
    pagination,
    page,
    filter,
    timestamp
  };
};

export const meta: MetaFunction<typeof loader> = ({ location, data }) => {
  const title = generateTitleFromFilter(data?.filter ?? {});

  return [
    { title: title + ' | Anime Garden 動漫花園資源網第三方镜像站' },
    {
      name: 'description',
      content: `最新资源 ${stringifySearch(new URLSearchParams(location.search))}`
    }
  ];
};

export const clientLoader: ClientLoaderFunction = async ({ serverLoader }) => {
  const serverData = await serverLoader<typeof loader>();
  if (serverData?.filter?.subjects) {
    await waitForSubjectsLoaded();
  }
  return serverData;
};
clientLoader.hydrate = true;

export default function ResourcesIndex() {
  const location = useLocation();
  const { ok, resources, pagination, filter, page, timestamp } = useLoaderData<typeof loader>();
  const feedURL = useMemo(() => getFeedURL(location.search), [location]);

  usePreferFansub(filter?.fansubs);

  return (
    <Layout feedURL={feedURL} timestamp={timestamp}>
      <div className="w-full pt-13 pb-24">
        {ok ? (
          <>
            <FilterCard
              filter={filter as any}
              feedURL={feedURL}
              resources={resources}
              complete={pagination?.complete ?? false}
            ></FilterCard>
            <Resources
              resources={resources}
              page={page}
              complete={pagination?.complete ?? false}
              timestamp={new Date(timestamp!)}
              link={(page) => `/resources/${page}${location.search}`}
            ></Resources>
          </>
        ) : (
          <Error></Error>
        )}
      </div>
    </Layout>
  );
}
