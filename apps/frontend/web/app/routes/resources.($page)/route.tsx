import { useMemo } from 'react';
import { redirect, useLoaderData, useLocation } from '@remix-run/react';
import { type LoaderFunctionArgs, type MetaFunction, json } from '@remix-run/cloudflare';

import { generateFilterShortTitle, parseURLSearch } from '@animegarden/client';

import Layout from '~/layouts/Layout';
import Resources from '~/components/Resources';
import { fetchResources } from '~/utils/fetch';
import { usePreferFansub } from '~/states';

import { Error } from './Error';
import { Filter } from './Filter';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const title = generateFilterShortTitle(data?.filter ?? {});

  return [
    { title: title + ' | Anime Garden 動漫花園資源網第三方镜像站' },
    { name: 'description', content: 'Anime Garden 動漫花園資源網第三方镜像站' }
  ];
};

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

  const parsed = parseURLSearch(url.searchParams, { pageSize: 80 });
  const page = +(params.page ?? '1');
  const { ok, resources, complete, filter, timestamp } = await fetchResources({
    ...parsed,
    page: +(params.page ?? '1')
  });

  return json({
    ok,
    resources,
    complete,
    page,
    filter,
    timestamp
  });
};

export default function ResourcesIndex() {
  const location = useLocation();
  const { ok, resources, complete, filter, page, timestamp } = useLoaderData<typeof loader>();
  const feedURL = useMemo(() => `/feed.xml${location.search}`, [location]);

  usePreferFansub(filter?.fansubs);

  return (
    <Layout feedURL={feedURL} timestamp={timestamp}>
      <div className="w-full pt-12 pb-24">
        {ok ? (
          <>
            <Filter filter={filter as any} feedURL={feedURL}></Filter>
            <Resources
              resources={resources}
              page={page}
              complete={complete}
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
