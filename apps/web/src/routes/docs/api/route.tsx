import { createFileRoute } from '@tanstack/react-router';

import Page from '~/pages/docs.api/route';
import { fetchTimestamp, getCanonicalURL } from '~/utils';

const loader = async () => {
  return await fetchTimestamp();
};

export const Route = createFileRoute('/docs/api')({
  loader,
  head: () => ({
    meta: [
      { title: 'API 文档 | Anime Garden 動漫花園資源網镜像站 动漫花园动画 BT 资源聚合站' },
      { name: 'description', content: 'Anime Garden 动画 BT 资源开放接口文档' }
    ],
    links: [{ rel: 'canonical', href: getCanonicalURL('/docs/api') }]
  }),
  component: DocsApiRoute
});

function DocsApiRoute() {
  const { timestamp } = Route.useLoaderData();
  return <Page timestamp={timestamp} />;
}
