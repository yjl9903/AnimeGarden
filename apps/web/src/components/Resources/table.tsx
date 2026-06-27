import { Link, useHydrated, useLocation, type ParsedLocation } from '@tanstack/react-router';

import CarbonError from '~icons/carbon/error';
import CarbonLaunch from '~icons/carbon/launch';
import CarbonPlay from '~icons/carbon/play';
import CarbonDownload from '~icons/carbon/download';

import { memo } from 'react';

import type { Resource, Jsonify } from '@animegarden/client';

import { CarbonTypes, DisplayTypeIcon } from '~/components/Icons';
import {
  DisplayTypeColor,
  getPikPakUrlChecker,
  formatChinaTime,
  parseSize,
  getPikPakTrackEvent,
  getDownloadTrackEvent,
  trackResourceDetailClick,
  trackResourceRefineFilterClick
} from '~/utils';
import { toRouterSearch } from '~/utils/routes';

import { Tag } from './tag';
import { Pagination, PaginationProps } from './pagination';

export interface ResourcesTableProps extends Partial<PaginationProps> {
  className?: string;

  resources: Resource<{ tracker: true }>[];

  columns?: {
    /**
     * 是否显示发布者
     *
     * @default true
     */
    fansub?: boolean;
  };
}

function getDetailRouteLink(r: Pick<Resource, 'provider' | 'providerId'>) {
  return {
    to: '/detail/$provider/$providerId' as const,
    params: { provider: r.provider, providerId: r.providerId }
  };
}

function followSearch(location: ParsedLocation, params: Record<string, string>) {
  const s = new URLSearchParams(location.searchStr);
  for (const [key, value] of Object.entries(params)) {
    s.set(key, value);
  }
  return toRouterSearch(s);
}

export default function ResourcesTable(props: ResourcesTableProps) {
  const location = useLocation();
  const { className, resources, link, columns } = props;

  const { fansub: isDisplayFansub = true } = columns ?? {};

  return (
    <div>
      <div className={'overflow-y-auto w-full' + (className ? ' ' + className : '')}>
        <table className="resources-table border-collapse min-y-[1080px] w-full">
          <colgroup>
            {/* <col className="py3 w-[160px] min-w-[100px] lt-lg:w-[100px] lt-sm:w-[100px]" /> */}
            <col className="text-left xl:min-w-[600px] lg:min-w-[480px]" />
            <col className="w-max whitespace-nowrap" />
            <col className="w-max whitespace-nowrap" />
          </colgroup>
          <thead className="resources-table-head border-b-2 text-lg lt-lg:text-base">
            <tr className="">
              {/* <th className="py3 w-[160px] min-w-[100px] lt-lg:w-[100px] lt-sm:w-[100px]">
              发布时间
            </th> */}
              <th className="py3 pl3 lt-sm:pl1 text-left xl:min-w-[600px] lg:min-w-[480px]">
                <div className="flex">
                  <div className="flex-shrink-0 mr3 flex justify-center items-center w-[32px]">
                    <CarbonTypes />
                  </div>
                  <div>资源</div>
                </div>
              </th>
              {isDisplayFansub && <th className="py3 min-w-[60px]">发布者</th>}
              <th className="py3 px2 text-center w-[72px]">播放</th>
            </tr>
          </thead>
          <tbody className="resources-table-body divide-y border-b text-base lt-lg:text-sm">
            {resources.map((r) => (
              <ResourceItem
                key={`${r.provider}/${r.providerId}`}
                resource={r}
                columns={columns}
              ></ResourceItem>
            ))}
          </tbody>
        </table>
      </div>
      {props.page !== undefined && resources.length === 0 && (
        <div>
          <div className="h-20 text-2xl text-orange-600/80 flex items-center justify-center">
            <CarbonError className="mr-2"></CarbonError>
            <span>没有搜索到匹配的资源</span>
          </div>
          <div className="flex items-center justify-center">
            {/* <span className="">返回&nbsp;</span> */}
            {!location.pathname.endsWith('/1') && link && (
              <>
                <Link {...link(1)} className="text-link">
                  第 1 页
                </Link>
                <span>&nbsp;/&nbsp;</span>
              </>
            )}
            <Link to="/" className="text-link">
              主页
            </Link>
          </div>
        </div>
      )}
      {props.page !== undefined && !props.complete && resources.length > 0 && (
        <Pagination
          timestamp={props.timestamp}
          page={props.page}
          link={props.link}
          navigate={props.navigate}
          complete={props.complete ?? false}
        />
      )}
    </div>
  );
}

export const ResourceItem = memo(
  (props: {
    resource: ResourcesTableProps['resources'][number];
    columns?: ResourcesTableProps['columns'];
  }) => {
    const hydrated = useHydrated();

    const location = useLocation();
    const { resource: r } = props;
    const { fansub: isDisplayFansub = true } = props.columns ?? {};

    return (
      <tr className="">
        <td className="py2 pl3 lt-md:pl1">
          <div className="flex xl:min-w-[600px] lg:min-w-[480px] lt-lg:w-[calc(95vw-4px)]">
            <div className="flex-shrink-0 mr3 flex justify-center items-center">
              <Link
                to="/resources/$page"
                params={{ page: '1' }}
                search={followSearch(location, { type: r.type })}
                onClick={() => trackResourceRefineFilterClick('type', r.type)}
                className={`flex items-center justify-center h-[32px] w-[32px] rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 ${DisplayTypeColor[r.type]}`}
              >
                {DisplayTypeIcon[r.type]({})}
              </Link>
            </div>
            <div>
              <div className="flex items-center justify-start">
                <div className="flex-1">
                  <span className="mr3">
                    {['动画', '合集', '日剧', '特摄'].includes(r.type) ? (
                      <>
                        <a
                          href={getPikPakUrlChecker(r.magnet)}
                          {...getPikPakTrackEvent(r.provider, r.providerId, 'title')}
                          className="text-link mr1"
                          aria-label={`Go to download resource of ${r.title}`}
                          target="_blank"
                        >
                          {r.title}
                        </a>
                      </>
                    ) : (
                      <Link
                        {...getDetailRouteLink(r)}
                        className="text-link"
                        aria-label={`Go to resource detail of ${r.title}`}
                      >
                        {r.title}
                      </Link>
                    )}
                  </span>
                </div>
              </div>
              <div className="mt1 flex items-center gap-4">
                <Link
                  {...getDetailRouteLink(r)}
                  className="text-link-secondary-hover-base text-xs text-zinc-400"
                >
                  发布于 {formatChinaTime(new Date(r.createdAt))}
                </Link>
                <a
                  href={r.magnet + (hydrated ? r.tracker : '')}
                  {...getDownloadTrackEvent(r.provider, r.providerId, 'size')}
                  data-resource-title={r.title}
                  className="text-link-secondary-hover-base text-xs text-zinc-400"
                  aria-label="Download resource"
                >
                  大小 {parseSize(r.size)}
                </a>
                <Link
                  {...getDetailRouteLink(r)}
                  onClick={() =>
                    trackResourceDetailClick({
                      provider: r.provider,
                      providerId: r.providerId,
                      type: r.type
                    })
                  }
                  className="text-link-secondary text-xs"
                  aria-label={`Go to resource detail of ${r.title}`}
                >
                  <CarbonLaunch className="vertical-middle relative bottom-[1px] inline-block"></CarbonLaunch>
                  <span> </span>
                  <span className="more">详情</span>
                </Link>
              </div>
            </div>
          </div>
        </td>
        {isDisplayFansub && (
          <td className="py2 px2 lt-sm:px0">
            <div className="flex justify-center items-center">
              {r.fansub ? (
                <Link
                  to="/resources/$page"
                  params={{ page: '1' }}
                  search={followSearch(location, { fansub: r.fansub.name })}
                  onClick={() => trackResourceRefineFilterClick('fansub', r.fansub!.name)}
                  className="block w-max"
                  aria-label={`Go to resources list of fansub ${r.fansub.name}`}
                >
                  <Tag
                    text={r.fansub.name}
                    className={`text-xs hover:bg-gray-300 dark:hover:bg-gray-700`}
                  />
                </Link>
              ) : r.publisher ? (
                <Link
                  to="/resources/$page"
                  params={{ page: '1' }}
                  search={followSearch(location, { publisher: r.publisher.name })}
                  onClick={() => trackResourceRefineFilterClick('publisher', r.publisher!.name)}
                  className="block w-max"
                  aria-label={`Go to resources list of publisher ${r.publisher.name}`}
                >
                  <Tag
                    text={r.publisher.name}
                    className={`text-xs hover:bg-gray-300 dark:hover:bg-gray-700`}
                  />
                </Link>
              ) : null}
            </div>
          </td>
        )}
        <td className="py2 px2 w-[72px]">
          <div className="flex gap1 items-center justify-start">
            <a
              href={getPikPakUrlChecker(r.magnet)}
              {...getPikPakTrackEvent(r.provider, r.providerId, 'play')}
              data-resource-title={r.title}
              className="play text-xl text-base-500 hover:text-base-900"
              aria-label="Play resource"
              target="_blank"
            >
              <CarbonPlay />
            </a>
            <a
              href={r.magnet + (hydrated ? r.tracker : '')}
              {...getDownloadTrackEvent(r.provider, r.providerId, 'download')}
              data-resource-title={r.title}
              className="download text-xl text-base-500 hover:text-base-900"
              aria-label="Download resource"
            >
              <CarbonDownload />
            </a>
            {/* <span className="text-xs text-base-400 whitespace-nowrap">{r.size}</span> */}
          </div>
        </td>
      </tr>
    );
  }
);
