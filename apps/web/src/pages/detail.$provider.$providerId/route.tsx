import { Link } from '@tanstack/react-router';
import { formatInTimeZone } from 'date-fns-tz';

import Layout from '~/layouts/Layout';
import {
  splitMagnetURL,
  getPikPakUrlChecker,
  getPikPakTrackEvent,
  getDownloadTrackEvent
} from '~/utils';
import { getResourcesRouteLink } from '~/utils/routes';

import './detail.css';

import { FilesCard } from './FileTree';

export default function Resources({ data }: { data: any }) {
  const { timestamp, resource, detail } = data ?? {};

  const magnet =
    resource?.magnet ||
    detail?.magnets.find((m: { url: string }) => m.url.startsWith('magnet:'))?.url;
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
                {...getPikPakTrackEvent(provider, providerId, 'detail')}
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
                    {...getPikPakTrackEvent(provider, providerId, 'detail')}
                    className="play text-link-active underline underline-dotted underline-offset-6"
                    target="_blank"
                  >
                    在线播放
                  </a>
                </span>
                <a
                  href={pikpakUrl}
                  {...getPikPakTrackEvent(provider, providerId, 'detail')}
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
                    {...getDownloadTrackEvent(provider, providerId, 'detail')}
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
                  {...getResourcesRouteLink(1, { publisher: resource?.publisher.name ?? '' })}
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
                  <Link
                    {...getResourcesRouteLink(1, { fansub: resource.fansub.name })}
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
                  </Link>
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
