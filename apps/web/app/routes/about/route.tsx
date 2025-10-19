import { useLoaderData } from '@remix-run/react';
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';

import Layout from '~/layouts/Layout';
import { fetchTimestamp, getCanonicalURL } from '~/utils';

export const meta: MetaFunction = () => {
  return [
    { title: '关于 | Anime Garden 動漫花園資源網镜像站 动漫花园动画 BT 资源聚合站' },
    {
      name: 'description',
      content: 'Anime Garden 動漫花園資源網镜像站, 动漫花园动画 BT 资源聚合站'
    },
    { tagName: 'link', rel: 'canonical', href: getCanonicalURL('/about') }
  ];
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  return await fetchTimestamp();
};

export default function About() {
  const { timestamp } = useLoaderData<typeof loader>();

  return (
    <Layout timestamp={timestamp}>
      <div className="w-full pt-13 pb-24">
        <div className="h-[1000px]"></div>
      </div>
    </Layout>
  );
}
