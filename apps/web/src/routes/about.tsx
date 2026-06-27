import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery, type QueryClient } from '@tanstack/react-query';

import Page from '~/pages/about/route';
import { calendarQueryOptions, timestampQueryOptions } from '~/query';
import { getCanonicalURL } from '~/utils';
import { ResponseCacheControl, setCacheControl, setErrorResponse } from '~/utils/response';

const loader = async ({ context }: { context: { queryClient: QueryClient } }) => {
  const [data] = await Promise.all([
    context.queryClient.ensureQueryData(timestampQueryOptions()),
    context.queryClient.ensureQueryData(calendarQueryOptions())
  ]);
  if (data.ok) {
    await setCacheControl(ResponseCacheControl.List);
  } else {
    await setErrorResponse(500);
  }

  return data;
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
  const { data } = useSuspenseQuery(timestampQueryOptions());
  const { timestamp } = data;
  return <Page timestamp={timestamp} />;
}
