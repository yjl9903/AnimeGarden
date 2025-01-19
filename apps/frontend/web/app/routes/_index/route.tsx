import { useMemo } from 'react';
import { useLoaderData, useLocation } from '@remix-run/react';
import { type LoaderFunctionArgs, type MetaFunction, json } from '@remix-run/cloudflare';

import type { Resource } from '@animegarden/client';

import Layout from '~/layouts/Layout';
import Resources from '~/components/Resources';
import { generateFeed } from '~/utils/feed';
import { fetchResources } from '~/utils';

import { Error } from '../resources.($page)/Error';

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { ok, resources, timestamp } = await fetchResources({
    page: 1,
    pageSize: 80,
    type: '動畫'
  });
  return json({ ok, resources: resources as Resource<{ tracker: true }>[], timestamp });
};

export const meta: MetaFunction = () => {
  return [
    { title: 'Anime Garden 動漫花園資源網第三方镜像站' },
    { name: 'description', content: '}Anime Garden 動漫花園資源網第三方镜像站' }
  ];
};

export default function Index() {
  const location = useLocation();
  const { ok, resources, timestamp } = useLoaderData<typeof loader>();
  const feedURL = useMemo(
    () => `/feed.xml?filter=${generateFeed(new URLSearchParams(location.search))}`,
    [location]
  );

  return (
    <Layout feedURL={feedURL}>
      <div className="w-full pt-12 pb-24">
        {ok ? (
          <Resources
            resources={resources}
            page={1}
            timestamp={new Date(timestamp!)}
            complete={false}
            link={(page) => `/resources/${page}?type=動畫`}
          ></Resources>
        ) : (
          <Error></Error>
        )}
      </div>
    </Layout>
  );
}
