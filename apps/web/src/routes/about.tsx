import { createFileRoute } from '@tanstack/react-router';

import Page from '~/pages/about/route';
import { fetchTimestamp, getCanonicalURL } from '~/utils';

const loader = async () => {
  return await fetchTimestamp();
};

export const Route = createFileRoute('/about')({
  loader,
  head: () => ({
    meta: [
      { title: '关于 | Anime Garden 動漫花園資源網镜像站 动漫花园动画 BT 资源聚合站' },
      {
        name: 'description',
        content: 'Anime Garden 動漫花園資源網镜像站, 动漫花园动画 BT 资源聚合站'
      }
    ],
    links: [{ rel: 'canonical', href: getCanonicalURL('/about') }]
  }),
  component: AboutRoute
});

function AboutRoute() {
  const { timestamp } = Route.useLoaderData();
  return <Page timestamp={timestamp} />;
}
