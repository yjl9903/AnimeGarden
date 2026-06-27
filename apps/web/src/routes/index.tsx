import { createFileRoute, useLocation } from '@tanstack/react-router';
import { useSuspenseQuery, type QueryClient } from '@tanstack/react-query';

import type { Resource } from '@animegarden/client';

import Page from '~/pages/_index/route';
import { calendarQueryOptions, resourcesQueryOptions, type ResourcesQueryInput } from '~/query';
import { getCanonicalURL, getFeedURL, serializeError, getTrackingError } from '~/utils';
import { ResponseCacheControl, setCacheControl, setErrorResponse } from '~/utils/response';

const indexResourcesFilter = {
  page: 1,
  pageSize: 30,
  types: ['动画', '合集'],
  preset: 'bangumi'
} satisfies ResourcesQueryInput;

const loader = async ({
  context,
  location
}: {
  context: { queryClient: QueryClient };
  location: { href: string };
}) => {
  const [{ ok, resources, timestamp, error }] = await Promise.all([
    context.queryClient.ensureQueryData(resourcesQueryOptions(indexResourcesFilter)),
    context.queryClient.ensureQueryData(calendarQueryOptions())
  ]);

  if (error) {
    console.error(location.href, error);
  }

  if (!ok) {
    await setErrorResponse(500);
  } else {
    await setCacheControl(ResponseCacheControl.List);
  }

  return {
    ok,
    resources: resources as Resource<{ tracker: true }>[],
    timestamp,
    error: serializeError(error)
  };
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
  const { data } = useSuspenseQuery(resourcesQueryOptions(indexResourcesFilter));
  const pageData = {
    ...data,
    error: serializeError(data.error)
  };

  return (
    <Page
      data={pageData}
      feedURL={getFeedURL(location.searchStr)}
      path={`${location.pathname}${location.searchStr}`}
      renderError={getTrackingError(pageData.error, 'index-render-failed')}
    />
  );
}
