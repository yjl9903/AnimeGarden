import { createFileRoute, useLocation } from '@tanstack/react-router';

import type { Resource } from '@animegarden/client';

import Page from '~/pages/_index/route';
import {
  fetchResources,
  getCanonicalURL,
  getFeedURL,
  serializeError,
  getTrackingError
} from '~/utils';
import { setResponseStatus } from '~/utils/response';

const loader = async ({ location }: { location: { href: string } }) => {
  try {
    const { ok, resources, timestamp, error } = await fetchResources({
      page: 1,
      pageSize: 30,
      types: ['动画', '合集'],
      preset: 'bangumi'
    });

    if (error) {
      console.error(location.href, error);
    }

    if (!ok) {
      await setResponseStatus(500);
    }

    return {
      ok,
      resources: resources as Resource<{ tracker: true }>[],
      timestamp,
      error: serializeError(error)
    };
  } catch (error) {
    console.error(location.href, error);
    await setResponseStatus(500);

    return {
      ok: false,
      resources: [] as Resource<{ tracker: true }>[],
      timestamp: undefined,
      error: serializeError(error)
    };
  }
};

export const Route = createFileRoute('/')({
  loader,
  head: () => ({
    meta: [
      { title: 'Anime Garden 動漫花園資源網镜像站 动漫花园动画 BT 资源聚合站' },
      {
        name: 'description',
        content: 'Anime Garden 動漫花園資源網镜像站, 动漫花园动画 BT 资源聚合站'
      }
    ],
    links: [{ rel: 'canonical', href: getCanonicalURL('/') }]
  }),
  component: IndexRoute
});

function IndexRoute() {
  const location = useLocation();
  const data = Route.useLoaderData();

  return (
    <Page
      data={data}
      feedURL={getFeedURL(location.searchStr)}
      path={`${location.pathname}${location.searchStr}`}
      renderError={getTrackingError(data.error, 'index-render-failed')}
    />
  );
}
