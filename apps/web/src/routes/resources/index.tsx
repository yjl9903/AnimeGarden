import { createFileRoute, redirect } from '@tanstack/react-router';

import { getCanonicalURL } from '~/utils';

export const Route = createFileRoute('/resources/')({
  loader: ({ location }) => {
    throw redirect({ href: `/resources/1${location.searchStr}` });
  },
  head: () => ({
    meta: [
      { title: '最新资源 | Anime Garden 動漫花園資源網镜像站 动漫花园动画 BT 资源聚合站' },
      {
        name: 'description',
        content: '最新资源'
      }
    ],
    links: [{ rel: 'canonical', href: getCanonicalURL('/resources/1') }]
  })
});
