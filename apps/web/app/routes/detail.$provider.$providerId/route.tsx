import { Link, useLoaderData } from '@remix-run/react';
import { redirect, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';

import { parse } from 'anipar';
import { formatInTimeZone } from 'date-fns-tz';

import { truncate } from '@animegarden/shared';
import { SupportProviders } from '@animegarden/client';

import { APP_HOST } from '~build/env';

import Layout from '~/layouts/Layout';
import {
  splitMagnetURL,
  fetchResourceDetail,
  getCanonicalURL,
  getPikPakUrlChecker,
  getPikPakTrackEvent,
  getDownloadTrackEvent
} from '~/utils';
import { getSubjectById } from '~/utils/subjects';

import './detail.css';

import { FilesCard } from './FileTree';

export const loader = async ({ params }: LoaderFunctionArgs) => {
  try {
    const { provider, providerId } = params;
    if (provider && providerId && SupportProviders.includes(provider)) {
      const data = await fetchResourceDetail(provider, providerId);
      if (data?.ok && data?.resource) {
        const { normalizeDescription } = await import('@animegarden/scraper');

        const description = data?.detail?.description
          ? normalizeDescription(data?.detail?.description ?? '')
          : undefined;

        return {
          ...data,
          description
        };
      }
    }
  } catch (error) {
    console.error('[ERROR]', error);
  }

  return redirect('/');
};

export const meta: MetaFunction<typeof loader> = ({ location, data, params }) => {
  const resource = data?.resource;
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
        url: `https://${APP_HOST}${location.pathname}${location.search}`
      })
    : undefined;

  const title = info?.title ?? resourceTitle;
  const description = data?.description;
  const descriptionText =
    description && title
      ? description.summary.startsWith(title)
        ? description.summary
        : `${title}: ${description.summary}`
      : `${title}: ${description?.summary ?? data?.detail?.description}`;

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
  const subject = resource?.subjectId ? getSubjectById(resource.subjectId) : undefined;
  const subjectImage = subject?.bangumi?.images.large;
  if (cover || subjectImage) {
    og.push({
      name: 'og:image',
      content: cover ?? subjectImage
    });
  }

  return [
    {
      title: resourceTitle
        ? truncate(resourceTitle, 70)
        : '资源 | Anime Garden 動漫花園資源網第三方镜像站'
    },
    {
      name: 'description',
      content: descriptionText
    },
    {
      tagName: 'link',
      rel: 'canonical',
      href: getCanonicalURL(`/detail/${params.provider}/${params.providerId}`)
    },
    ...og,
    {
      'script:ld+json': schema
    }
  ];
};

export default function Resources() {
  const data = useLoaderData<typeof loader>();
  const { timestamp, resource, detail } = data ?? {};

  const magnet = resource?.magnet || detail?.magnets.find((m) => m.url.startsWith('magnet:'))?.url;
  const pikpakUrl = magnet ? getPikPakUrlChecker(magnet) : '';

  const { provider, providerId } = resource!;

  const magnets =
    (detail?.magnets ?? resource)
      ? [{ name: '磁力链接', url: resource!.magnet + resource?.tracker }]
      : [];

  return (
    <Layout timestamp={timestamp} heading={false}>
      <div className="w-full pt-13 pb-24">
        <div className="detail mt-4vh w-full space-y-4">
          <h1 className="text-xl font-bold resource-title">
            <span>{resource?.title}</span>
          </h1>
          <div className="download-link rounded-md shadow-box">
            <h2 className="text-lg font-bold border-b px4 py2 flex items-center">
              <a
                href={pikpakUrl}
                {...getPikPakTrackEvent(provider, providerId)}
                className="play text-link-active underline underline-dotted underline-offset-6"
                target="_blank"
              >
                下载链接
              </a>
            </h2>
            <div
              className="p4 space-y-1 overflow-auto whitespace-nowrap
          [&>div>span:first-child]:(text-base-600 select-none inline-block w-[160px] min-w-[160px] lt-sm:w-[120px] lt-sm:min-w-[120px])
          [&>div]:(flex)
          [&>div>a]:(inline-block flex-1 pr-4) lt-md:text-sm"
            >
              <div>
                <span>
                  <a
                    href={pikpakUrl}
                    {...getPikPakTrackEvent(provider, providerId)}
                    className="play text-link-active underline underline-dotted underline-offset-6"
                    target="_blank"
                  >
                    在线播放
                  </a>
                </span>
                <a
                  href={pikpakUrl}
                  {...getPikPakTrackEvent(provider, providerId)}
                  className="play text-link"
                  target="_blank"
                >
                  使用 PikPak 播放
                </a>
              </div>
              {magnets.map((magnet) => (
                <div key={magnet.url}>
                  <span>{magnet.name}</span>
                  <a
                    href={magnet.url}
                    {...getDownloadTrackEvent(provider, providerId)}
                    className="download text-link"
                  >
                    {splitMagnetURL(magnet.url)}
                  </a>
                </div>
              ))}
              <div>
                <span>原链接</span>
                <a href={resource!.href} target="_blank" className="text-link">
                  {resource!.href}
                </a>
              </div>
            </div>
          </div>

          <div
            className="description"
            dangerouslySetInnerHTML={{
              __html: (detail?.description ?? '').replace(
                /(<strong>)?簡介:(&nbsp;)*(<\/strong>)?(<br>)?(<hr>)?/,
                '<h2 className="text-xl font-bold">简介</h2>'
              )
            }}
          />

          <div className="publisher">
            <h2 className="text-lg font-bold pb4">
              {resource?.fansub ? '发布者 / 字幕组' : '发布者'}
            </h2>
            <div className="flex gap8">
              <div>
                <Link
                  to={`/resources/1?publisher=${resource?.publisher.name}`}
                  className="block text-left"
                >
                  <img
                    src={
                      resource?.publisher.avatar ?? 'https://share.dmhy.org/images/defaultUser.png'
                    }
                    alt={`${resource?.publisher.name} avatar`}
                    className="inline-block w-[100px] h-[100px] rounded"
                    onError={(ev) => {
                      (ev.target as HTMLImageElement).src =
                        `https://share.dmhy.org/images/defaultUser.png`;
                    }}
                  />
                  <span className="text-link block mt2">{resource?.publisher.name}</span>
                </Link>
              </div>
              {resource?.fansub && (
                <div>
                  <a
                    href={`/resources/1?fansub=${resource.fansub.name}`}
                    className="block w-auto text-left"
                  >
                    <img
                      src={
                        resource.fansub.avatar ?? 'https://share.dmhy.org/images/defaultUser.png'
                      }
                      alt={`${resource.fansub.name} avatar`}
                      className="inline-block w-[100px] h-[100px] rounded"
                      onError={(ev) => {
                        (ev.target as HTMLImageElement).src =
                          `https://share.dmhy.org/images/defaultUser.png`;
                      }}
                    />
                    <span className="text-link block mt2">{resource.fansub.name}</span>
                  </a>
                </div>
              )}
            </div>
          </div>
          <div>
            <span className="font-bold">发布于&nbsp;</span>
            <span>
              {formatInTimeZone(
                new Date(resource?.createdAt ?? 0),
                'Asia/Shanghai',
                'yyyy-MM-dd HH:mm'
              )}
            </span>
          </div>
          <FilesCard
            files={detail?.files ?? []}
            hasMoreFiles={detail?.hasMoreFiles ?? false}
          ></FilesCard>
        </div>
      </div>
    </Layout>
  );
}
