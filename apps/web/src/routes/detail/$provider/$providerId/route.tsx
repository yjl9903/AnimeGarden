import { createFileRoute, redirect } from '@tanstack/react-router';
import { useSuspenseQuery, type QueryClient } from '@tanstack/react-query';

import { parse } from 'anipar';
import { truncate } from '@animegarden/shared';
import { SupportProviders } from '@animegarden/client';

import { APP_HOST } from '~build/env';

import Page from '~/pages/detail.$provider.$providerId/route';
import { getCanonicalURL } from '~/utils';
import { ResponseCacheControl, setCacheControl } from '~/utils/response';
import { calendarQueryOptions, resourceDetailQueryOptions, subjectQueryOptions } from '~/query';

const loader = async ({
  context,
  params
}: {
  context: { queryClient: QueryClient };
  params: { provider?: string; providerId?: string };
}) => {
  const { provider, providerId } = params;
  if (provider && providerId && SupportProviders.includes(provider)) {
    const [data] = await Promise.all([
      context.queryClient.ensureQueryData(resourceDetailQueryOptions(provider, providerId)),
      context.queryClient.ensureQueryData(calendarQueryOptions())
    ]);
    if (data?.ok && data?.resource) {
      const subject = data.resource.subjectId
        ? (await context.queryClient.ensureQueryData(subjectQueryOptions(data.resource.subjectId)))
            .subject
        : undefined;

      await setCacheControl(ResponseCacheControl.Detail);
      return { ...data, subject };
    }
  }

  throw redirect({ to: '/' });
};

export const Route = createFileRoute('/detail/$provider/$providerId')({
  loader,
  head: ({ loaderData, params }) => {
    const resource = loaderData?.resource;
    const resourceTitle = resource?.title;

    const info = resource ? parse(resource.title) : undefined;
    const schema = info
      ? JSON.stringify({
          '@context': 'http://schema.org',
          '@type': 'TVEpisode',
          partOfTVSeries: {
            '@type': 'TVSeries',
            name: info.title
          },
          partOfSeason: {
            '@type': 'TVSeason',
            seasonNumber: `${info.season?.number ?? 1}`
          },
          episodeNumber: info.episode?.number !== undefined ? `${info.episode.number}` : undefined,
          datePublished: resource ? new Date(resource.createdAt).toLocaleDateString() : undefined,
          url: `https://${APP_HOST}/detail/${params.provider}/${params.providerId}`
        })
      : undefined;

    const title = info?.title ?? resourceTitle;
    const description = loaderData?.description;
    const descriptionText =
      description && title
        ? description.summary.startsWith(title)
          ? description.summary
          : `${title}: ${description.summary}`
        : `${title}: ${description?.summary ?? loaderData?.detail?.description}`;

    const og = resource
      ? [
          {
            name: 'og:title',
            content: title
          },
          {
            name: 'og:url',
            content: `https://${APP_HOST}/detail/${resource.provider}/${resource.providerId}`
          },
          {
            name: 'og:type',
            content: ['动画', '合集', '日剧', '特摄'].includes(resource.type)
              ? 'video.episode'
              : ['音乐'].includes(resource.type)
                ? 'music.song'
                : 'website'
          },
          {
            name: 'og:logo',
            content: '/favicon.svg'
          }
        ]
      : [];

    const cover = description?.images[0]?.src;
    const subjectImage = loaderData?.subject?.poster;
    if (cover || subjectImage) {
      og.push({
        name: 'og:image',
        content: cover ?? subjectImage
      });
    }

    return {
      meta: [
        {
          title: resourceTitle
            ? truncate(resourceTitle, 70)
            : '资源详情 | Anime Garden 動漫花園資源網镜像站 动漫花园动画 BT 资源聚合站'
        },
        {
          name: 'description',
          content: descriptionText
        },
        ...og
      ],
      links: [
        {
          rel: 'canonical',
          href: getCanonicalURL(`/detail/${params.provider}/${params.providerId}`)
        }
      ],
      scripts: schema ? [{ type: 'application/ld+json', children: schema }] : []
    };
  },
  component: DetailRoute
});

function DetailRoute() {
  const params = Route.useParams();
  const { data } = useSuspenseQuery(
    resourceDetailQueryOptions(params.provider!, params.providerId!)
  );
  return <Page data={data} />;
}
