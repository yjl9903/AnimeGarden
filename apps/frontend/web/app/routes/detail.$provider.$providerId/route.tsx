import { useLoaderData, useLocation } from '@remix-run/react';
import { redirect, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';

import { parse } from 'anitomy';
import { formatInTimeZone } from 'date-fns-tz';

import Layout from '~/layouts/Layout';
import { fetchResourceDetail } from '~/utils/fetch';
import { getPikPakUrlChecker } from '~/utils/pikpak';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { provider, providerId } = params;
  if (provider && providerId && ['dmhy', 'moe', 'ani'].includes(provider)) {
    const detail = await fetchResourceDetail(provider, providerId);
    if (detail) {
      return { ok: true, detail };
    }
  }
  return redirect('/');
};

export const meta: MetaFunction<typeof loader> = () => {
  return [
    { title: 'Anime Garden 動漫花園資源網第三方镜像站' },
    { name: 'description', content: '}Anime Garden 動漫花園資源網第三方镜像站' }
  ];
};

export default function Resources() {
  const location = useLocation();
  const { detail } = useLoaderData<typeof loader>();
  const pikpakUrl = getPikPakUrlChecker(detail.magnet.href);
  const files = detail.magnet.files.filter(
    (f) => f.size !== '種子可能不存在' && f.size !== 'Bytes'
  );
  const info = parse(detail.title);
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
          seasonNumber: `${info.season ?? 1}`
        },
        episodeNumber: info.episode.number !== undefined ? `${info.episode.number}` : undefined,
        datePublished: detail.createdAt,
        url: location.toString()
      })
    : undefined;

  return (
    <Layout>
      <div className="w-full pt-12 pb-24">
        <div className="detail mt-4vh w-full space-y-4">
          <h1 className="text-xl font-bold resource-title">
            <span>{detail.title}</span>
          </h1>
          <div className="download-link rounded-md shadow-box">
            <h2 className="text-lg font-bold border-b px4 py2 flex items-center">
              <a
                href={pikpakUrl}
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
                    target="_blank"
                    className="play text-link-active underline underline-dotted underline-offset-6"
                  >
                    在线播放
                  </a>
                </span>
                <a href={pikpakUrl} target="_blank" className="play text-link">
                  使用 PikPak 播放
                </a>
              </div>
              <div>
                <span>磁力链接</span>
                <a href={detail.magnet.href} className="download text-link">
                  {detail.magnet.href.split('&')[0]}
                </a>
              </div>
              <div>
                <span>磁力链接 type II</span>
                <a href={detail.magnet.href2} className="download text-link">
                  {detail.magnet.href2}
                </a>
              </div>
              {detail.magnet.user && (
                <div>
                  <span>会员链接</span>
                  <a href={detail.magnet.user} className="download text-link">
                    {detail.magnet.user}
                  </a>
                </div>
              )}
              <div>
                <span>原链接</span>
                <a href={detail.href} target="_blank" className="text-link">
                  {detail.href}
                </a>
              </div>
            </div>
          </div>

          <div
            className="description"
            dangerouslySetInnerHTML={{
              __html: detail.description.replace(
                /簡介:(&nbsp;)?/,
                '<h2 className="text-lg font-bold">简介</h2>'
              )
            }}
          />

          <div className="publisher">
            <h2 className="text-lg font-bold pb4">
              {detail.fansub ? '发布者 / 字幕组' : '发布者'}
            </h2>
            <div className="flex gap8">
              <div>
                <a
                  href={`/resources/1?publisherId=${detail.publisher.id}`}
                  className="block text-left"
                >
                  <img
                    src={detail.publisher.avatar}
                    alt="Publisher Avatar"
                    className="inline-block w-[100px] h-[100px] rounded"
                    onError={(ev) => {
                      (ev.target as HTMLImageElement).src =
                        `https://share.dmhy.org/images/defaultUser.png`;
                    }}
                  />
                  <span className="text-link block mt2">{detail.publisher.name}</span>
                </a>
              </div>
              {detail.fansub && (
                <div>
                  <a
                    href={`/resources/1?fansubId=${detail.fansub.id}`}
                    className="block w-auto text-left"
                  >
                    <img
                      src={detail.fansub.avatar}
                      alt="Fansub Avatar"
                      className="inline-block w-[100px] h-[100px] rounded"
                      onError={(ev) => {
                        (ev.target as HTMLImageElement).src =
                          `https://share.dmhy.org/images/defaultUser.png`;
                      }}
                    />
                    <span className="text-link block mt2">{detail.fansub.name}</span>
                  </a>
                </div>
              )}
            </div>
          </div>
          <div>
            <span className="font-bold">发布于&nbsp;</span>
            <span>
              {formatInTimeZone(new Date(detail.createdAt), 'Asia/Shanghai', 'yyyy-MM-dd HH:mm')}
            </span>
          </div>
          <div className="file-list rounded-md shadow-box">
            <h2 className="text-lg font-bold border-b px4 py2">文件列表</h2>
            <div className="mb4 max-h-[80vh] overflow-auto px4">
              {files.map((f) => (
                <div key={f.name + '_' + f.size} className="py2 flex justify-between items-center gap4">
                  <div className="text-sm text-base-600">{f.name}</div>
                  <div className="text-xs text-base-400 select-none">{f.size}</div>
                </div>
              ))}
              {files.length === 0 ? (
                <div className="py2 select-none text-center text-red-400">种子信息解析失败</div>
              ) : undefined}
              {detail.magnet.hasMoreFiles ? <div className="text-base-400">...</div> : undefined}
            </div>
          </div>
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
