import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery, type QueryClient } from '@tanstack/react-query';

import Page from '~/pages/docs.api/route';
import { calendarQueryOptions, timestampQueryOptions } from '~/query';
import { getCanonicalURL } from '~/utils';
import { ResponseCacheControl, setCacheControl, setErrorResponse } from '~/utils/response';

const loader = async ({ context }: { context: { queryClient: QueryClient } }) => {
  const [data] = await Promise.all([
    context.queryClient.ensureQueryData(timestampQueryOptions()),
    context.queryClient.ensureQueryData(calendarQueryOptions())
  ]);
  if (data.ok) {
    await setCacheControl(ResponseCacheControl.Docs);
  } else {
    await setErrorResponse(500);
  }

  return data;
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
  const { data } = useSuspenseQuery(timestampQueryOptions());
  const { timestamp } = data;
  return <Page timestamp={timestamp} />;
}
