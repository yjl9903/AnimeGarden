import { useMemo } from 'react';
import { useLoaderData, useLocation } from '@remix-run/react';
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';

import type { Resource } from '@animegarden/client';

import Layout from '~/layouts/Layout';
import Resources from '~/components/Resources';
import { fetchResources, getFeedURL, getCanonicalURL } from '~/utils';

import { Error } from '../resources.($page)/Error';

export const loader = async ({ params }: LoaderFunctionArgs) => {
  try {
    const { ok, resources, timestamp, error } = await fetchResources({
      page: 1,
      pageSize: 30,
      types: ['动画', '合集'],
      preset: 'bangumi'
    });

    if (error) {
      console.error('[ERROR]', error);
    }

    return { ok, resources: resources as Resource<{ tracker: true }>[], timestamp };
  } catch (error) {
    console.error('[ERROR]', error);

    return { ok: false, resources: [], timestamp: undefined };
  }
};

export const meta: MetaFunction = () => {
  return [
    { title: 'Anime Garden 動漫花園資源網镜像站 动漫花园动画 BT 资源聚合站' },
    { name: 'description', content: 'Anime Garden 動漫花園資源網镜像站, 动漫花园动画 BT 资源聚合站' },
    { tagName: 'link', rel: 'canonical', href: getCanonicalURL('/') }
  ];
};

export default function Index() {
  const location = useLocation();
  const { ok, resources, timestamp } = useLoaderData<typeof loader>();
  const feedURL = useMemo(() => getFeedURL(location.search), [location]);

  return (
    <Layout feedURL={feedURL} timestamp={timestamp}>
      <div className="w-full pt-13 pb-24">
        {ok ? (
          <Resources
            resources={resources}
            page={1}
            timestamp={new Date(timestamp!)}
            complete={false}
            link={(page) => `/resources/${page}?type=动画&type=合集&preset=bangumi`}
          ></Resources>
        ) : (
          <Error></Error>
        )}
      </div>
    </Layout>
  );
}
