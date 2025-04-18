// @ts-nocheck

import { useLoaderData, useLocation } from '@remix-run/react';
import { redirect, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';

import { parse } from 'anipar';
import { formatInTimeZone } from 'date-fns-tz';

import { type FetchResourceDetailResult, SupportProviders } from '@animegarden/client';

import Layout from '~/layouts/Layout';
import {
  splitMagnetURL,
  fetchTimestamp,
  fetchResourceDetail,
  getPikPakUrlChecker,
  getPikPakTrackEvent,
  getDownloadTrackEvent
} from '~/utils';

import { FilesCard } from './FileTree';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  try {
    const { provider, providerId } = params;
    if (provider && providerId && SupportProviders.includes(provider)) {
      const detail = await fetchResourceDetail(provider, providerId);
      if (detail?.ok) {
        return detail;
      }
    } else {
      return await fetchTimestamp();
    }
  } catch (error) {
    console.error('[ERROR]', error);
  }

  return redirect('/');
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const title = data?.resource?.title ?? '';

  return [
    { title: (title ? title + ' | ' : '') + 'Anime Garden 動漫花園資源網第三方镜像站' },
    { name: 'description', content: `${title}` }
  ];
};

export default function Resources() {
  const location = useLocation();
  const data = useLoaderData<typeof loader>();
  const { timestamp, resource, detail } = (data ?? {}) as FetchResourceDetailResult;

  const magnet = resource.magnet || detail?.magnets.find((m) => m.url.startsWith('magnet:'))?.url;
  const pikpakUrl = magnet ? getPikPakUrlChecker(magnet) : '';

  const { provider, providerId } = resource;

  // const files = detail.magnet.files.filter(
  //   (f) => f.size !== '種子可能不存在' && f.size !== 'Bytes'
  // );
  const files = detail?.files ?? [];
  const magnets = detail?.magnets ?? resource ? [{ name: '磁力链接', url: resource.magnet + resource?.tracker }] : [];

  const info = parse(resource.title);
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
        url: location.toString()
      })
    : undefined;

  return (
    <Layout timestamp={timestamp}>
      <div className="w-full pt-12 pb-24">
        <div className="detail mt-4vh w-full space-y-4">
          <h1 className="text-xl font-bold resource-title">
            <span>{resource.title}</span>
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
                <a href={resource.href} target="_blank" className="text-link">
                  {resource.href}
                </a>
              </div>
            </div>
          </div>

          <div
            className="description"
            dangerouslySetInnerHTML={{
              __html: (detail?.description ?? '').replace(
                /簡介:(&nbsp;)?/,
                '<h2 className="text-lg font-bold">简介</h2>'
              )
            }}
          />

          <div className="publisher">
            <h2 className="text-lg font-bold pb4">
              {resource.fansub ? '发布者 / 字幕组' : '发布者'}
            </h2>
            <div className="flex gap8">
              <div>
                <a
                  href={`/resources/1?publisher=${resource.publisher.name}`}
                  className="block text-left"
                >
                  <img
                    src={
                      resource.publisher.avatar ?? 'https://share.dmhy.org/images/defaultUser.png'
                    }
                    alt="Publisher Avatar"
                    className="inline-block w-[100px] h-[100px] rounded"
                    onError={(ev) => {
                      (ev.target as HTMLImageElement).src =
                        `https://share.dmhy.org/images/defaultUser.png`;
                    }}
                  />
                  <span className="text-link block mt2">{resource.publisher.name}</span>
                </a>
              </div>
              {resource.fansub && (
                <div>
                  <a
                    href={`/resources/1?fansub=${resource.fansub.name}`}
                    className="block w-auto text-left"
                  >
                    <img
                      src={
                        resource.fansub.avatar ?? 'https://share.dmhy.org/images/defaultUser.png'
                      }
                      alt="Fansub Avatar"
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
              {formatInTimeZone(new Date(resource.createdAt), 'Asia/Shanghai', 'yyyy-MM-dd HH:mm')}
            </span>
          </div>
          <FilesCard
            files={detail?.files ?? []}
            hasMoreFiles={detail?.hasMoreFiles ?? false}
          ></FilesCard>
        </div>
      </div>
      {/* structure data */}
      {info && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}
    </Layout>
  );
}
