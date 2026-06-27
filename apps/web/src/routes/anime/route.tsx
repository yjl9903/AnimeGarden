import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery, type QueryClient } from '@tanstack/react-query';

import Page from '~/pages/anime/route';
import { calendarQueryOptions, timestampQueryOptions } from '~/query';
import { getCanonicalURL } from '~/utils';
import { ResponseCacheControl, setCacheControl, setErrorResponse } from '~/utils/response';

const loader = async ({ context }: { context: { queryClient: QueryClient } }) => {
  const [timestamp, calendar] = await Promise.all([
    context.queryClient.ensureQueryData(timestampQueryOptions()),
    context.queryClient.ensureQueryData(calendarQueryOptions())
  ]);

  if (timestamp.ok && calendar.ok) {
    await setCacheControl(ResponseCacheControl.List);
  } else {
    await setErrorResponse(500);
  }

  return {
    ...timestamp,
    calendar: calendar.calendar
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
  const { data: timestamp } = useSuspenseQuery(timestampQueryOptions());
  const { data: calendar } = useSuspenseQuery(calendarQueryOptions());
  return <Page timestamp={timestamp.timestamp} calendar={calendar.calendar} />;
}
