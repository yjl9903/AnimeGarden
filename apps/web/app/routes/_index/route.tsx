import { useMemo } from 'react';
import { useLoaderData, useLocation } from '@remix-run/react';
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';

import type { Resource } from '@animegarden/client';

import Layout from '~/layouts/Layout';
import Resources from '~/components/Resources';
import { fetchResources, getFeedURL } from '~/utils';

import { Error } from '../resources.($page)/Error';

export const loader = async ({ params }: LoaderFunctionArgs) => {
  try {
    const { ok, resources, timestamp } = await fetchResources({
      page: 1,
      pageSize: 30,
      types: ['动画', '合集'],
      preset: 'bangumi'
    });

    return { ok, resources: resources as Resource<{ tracker: true }>[], timestamp };
  } catch (error) {
    console.error('[ERROR]', error);

    return { ok: false, resources: [], timestamp: undefined };
  }
};

export const meta: MetaFunction = () => {
  return [
    { title: 'Anime Garden 動漫花園資源網第三方镜像站' },
    { name: 'description', content: 'Anime Garden 動漫花園資源網第三方镜像站' }
  ];
};

export default function Index() {
  const location = useLocation();
  const { ok, resources, timestamp } = useLoaderData<typeof loader>();
  const feedURL = useMemo(() => getFeedURL(location.search), [location]);

  return (
    <Layout feedURL={feedURL} timestamp={timestamp}>
      <div className="w-full pt-12 pb-24">
        {ok ? (
          <Resources
            resources={resources}
            page={1}
            timestamp={new Date(timestamp!)}
            complete={false}
            link={(page) => `/resources/${page}?type=动画`}
          ></Resources>
        ) : (
          <Error></Error>
        )}
      </div>
    </Layout>
  );
}
