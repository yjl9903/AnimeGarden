import { createFileRoute } from '@tanstack/react-router';

import Page from '~/pages/anime/route';
import { fetchTimestamp, getCanonicalURL } from '~/utils';

const loader = async () => {
  return {
    timestamp: (await fetchTimestamp()).timestamp
  };
};

export const Route = createFileRoute('/anime')({
  loader,
  head: () => ({
    meta: [
      { title: '动画周历 | Anime Garden 動漫花園資源網镜像站 动漫花园动画 BT 资源聚合站' },
      {
        name: 'description',
        content:
          '动画每周播出时间表, 动画周历, Anime Garden 動漫花園資源網镜像站, 动漫花园动画 BT 资源聚合站'
      }
    ],
    links: [{ rel: 'canonical', href: getCanonicalURL('/anime') }]
  }),
  component: AnimeRoute
});

function AnimeRoute() {
  const { timestamp } = Route.useLoaderData();
  return <Page timestamp={timestamp} />;
}
