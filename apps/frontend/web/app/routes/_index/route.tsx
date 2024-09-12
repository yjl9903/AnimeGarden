import type { Resource } from 'animegarden';

import { useLoaderData } from '@remix-run/react';
import { type LoaderFunctionArgs, type MetaFunction, json } from '@remix-run/node';

import Layout from '~/layouts/Layout';
import { fetchResources } from '~/utils';

import Resources from '@/components/Resources';

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
  const { ok, resources, timestamp } = useLoaderData<typeof loader>();

  return (
    <Layout>
      <div className="w-full pt-12 pb-24">
        <Resources resources={resources}></Resources>
      </div>
    </Layout>
  );
}
