import { NavLink, useLocation, type Location } from '@remix-run/react';

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
  getDownloadTrackEvent
} from '~/utils';

import { Tag } from './tag';
import { Pagination, PaginationProps } from './pagination';

export interface ResourcesTableProps extends Partial<PaginationProps> {
  className?: string;

  pathname?: string;

  resources: Jsonify<Resource<{ tracker: true }>>[];
}

function getDetailHref(r: Jsonify<Resource>) {
  return `/detail/${r.provider}/${r.providerId}`;
}

function followSearch(location: Location, params: Record<string, string>) {
  const s = new URLSearchParams(location.search);
  for (const [key, value] of Object.entries(params)) {
    s.set(key, value);
  }
  return s.toString();
}

export default function ResourcesTable(props: ResourcesTableProps) {
  const location = useLocation();
  const { className, pathname, resources, link } = props;

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
              <th className="py3 min-w-[60px]">发布者</th>
              <th className="py3 px2 text-center w-max">播放</th>
            </tr>
          </thead>
          <tbody className="resources-table-body divide-y border-b text-base lt-lg:text-sm">
            {resources.map((r) => (
              <ResourceItem
                key={`${r.provider}/${r.providerId}`}
                pathname={pathname}
                resource={r}
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
                <NavLink to={link(1)} className="text-link">
                  第 1 页
                </NavLink>
                <span>&nbsp;/&nbsp;</span>
              </>
            )}
            <NavLink to="/" className="text-link">
              主页
            </NavLink>
          </div>
        </div>
      )}
      {props.page !== undefined && resources.length > 0 && (
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
  (props: { pathname?: string; resource: Jsonify<Resource<{ tracker: true }>> }) => {
    const location = useLocation();
    const { pathname, resource: r } = props;

    return (
      <tr className="">
        {/* <td className="py2 text-center">
    <a
      href={getDetailHref(r)}
      className="text-link-active"
      aria-label={`Go to resource detail of ${r.title}`}
    >
      {formatInTimeZone(new Date(r.createdAt), 'Asia/Shanghai', 'yyyy-MM-dd HH:mm')}
    </a>
  </td> */}
        <td className="py2 pl3 lt-md:pl1">
          <div className="flex xl:min-w-[600px] lg:min-w-[480px] lt-lg:w-[calc(95vw-4px)]">
            <div className="flex-shrink-0 mr3 flex justify-center items-center">
              <NavLink
                to={`${pathname ?? '/resources'}/1?${followSearch(location, { type: r.type })}`}
                className={`flex items-center justify-center h-[32px] w-[32px] rounded-full bg-gray-100 hover:bg-gray-200 ${DisplayTypeColor[r.type]}`}
              >
                {DisplayTypeIcon[r.type]({})}
              </NavLink>
            </div>
            <div>
              <div className="flex items-center justify-start">
                <div className="flex-1">
                  <span className="mr3">
                    {['动画', '合集', '日剧', '特摄'].includes(r.type) ? (
                      <>
                        <a
                          href={getPikPakUrlChecker(r.magnet)}
                          {...getPikPakTrackEvent(r.provider, r.providerId)}
                          className="text-link mr1"
                          aria-label={`Go to download resource of ${r.title}`}
                          target="_blank"
                        >
                          {r.title}
                        </a>
                      </>
                    ) : (
                      <NavLink
                        to={getDetailHref(r)}
                        className="text-link"
                        aria-label={`Go to resource detail of ${r.title}`}
                      >
                        {r.title}
                      </NavLink>
                    )}
                  </span>
                </div>
              </div>
              <div className="mt1 flex items-center gap-4">
                <NavLink
                  to={getDetailHref(r)}
                  className="text-link-secondary-hover-base text-xs text-zinc-400"
                >
                  发布于 {formatChinaTime(new Date(r.createdAt))}
                </NavLink>
                <a
                  href={r.magnet + r.tracker}
                  {...getDownloadTrackEvent(r.provider, r.providerId)}
                  data-resource-title={r.title}
                  className="text-link-secondary-hover-base text-xs text-zinc-400"
                  aria-label="Download resource"
                >
                  大小 {parseSize(r.size)}
                </a>
                <NavLink
                  to={getDetailHref(r)}
                  className="text-link-secondary text-xs"
                  aria-label={`Go to resource detail of ${r.title}`}
                >
                  <CarbonLaunch className="vertical-middle relative bottom-[1px] inline-block"></CarbonLaunch>
                  <span> </span>
                  <span className="more">更多</span>
                </NavLink>
              </div>
            </div>
          </div>
        </td>
        <td className="py2 px2 lt-sm:px0">
          <div className="flex justify-center items-center">
            {r.fansub ? (
              <NavLink
                to={`${pathname ?? '/resources'}/1?${followSearch(location, { fansub: r.fansub.name })}`}
                className="block w-max"
                aria-label={`Go to resources list of fansub ${r.fansub.name}`}
              >
                <Tag text={r.fansub.name} className={`text-xs hover:bg-gray-300`} />
              </NavLink>
            ) : r.publisher ? (
              <NavLink
                to={`${pathname ?? '/resources'}/1?${followSearch(location, { publisher: r.publisher.name })}`}
                className="block w-max"
                aria-label={`Go to resources list of publisher ${r.publisher.name}`}
              >
                <Tag text={r.publisher.name} className={`text-xs hover:bg-gray-300`} />
              </NavLink>
            ) : null}
          </div>
        </td>
        <td className="py2 px2">
          <div className="flex gap1 items-center justify-start">
            <a
              href={getPikPakUrlChecker(r.magnet)}
              {...getPikPakTrackEvent(r.provider, r.providerId)}
              data-resource-title={r.title}
              className="play text-xl text-base-500 hover:text-base-900"
              aria-label="Play resource"
              target="_blank"
            >
              <CarbonPlay />
            </a>
            <a
              href={r.magnet + r.tracker}
              {...getPikPakTrackEvent(r.provider, r.providerId)}
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
