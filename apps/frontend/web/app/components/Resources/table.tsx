import type { Resource } from 'animegarden';

import { memo } from 'react'
import { formatInTimeZone } from 'date-fns-tz';

import { getPikPakUrlChecker } from '@/utils';
import { DisplayType, DisplayTypeColor } from '@/constant';

import { Tag } from './tag';

export interface ResourcesTableProps {
  className?: string;

  resources: Resource<{ tracker: true }>[];
}

function getDetailHref(r: Resource) {
  return `/detail/${r.provider}/${r.providerId}`;
}

function followSearch(params: Record<string, string>) {
  // const s = new URLSearchParams(search);
  const s = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    s.set(key, value);
  }
  return s.toString();
}

export default function ResourcesTable(props: ResourcesTableProps) {
  const { resources, className } = props;

  return (
    <div className={'overflow-y-auto w-full' + (className ? ' ' + className : '')}>
      <table className="resources-table border-collapse min-y-[1080px] w-full">
        <colgroup>
          {/* <col className="py3 w-[160px] min-w-[100px] lt-lg:w-[100px] lt-sm:w-[100px]" /> */}
          <col className="py3 px2 text-left min-w-[600px] lg:min-w-[480px] md:min-w-[300px]" />
          <col className="w-max whitespace-nowrap" />
          <col className="w-max whitespace-nowrap" />
        </colgroup>
        <thead className="resources-table-head border-b border-b-2 text-lg lt-lg:text-base">
          <tr className="">
            {/* <th className="py3 w-[160px] min-w-[100px] lt-lg:w-[100px] lt-sm:w-[100px]">
              发布时间
            </th> */}
            <th className="py3 pl3 text-left min-w-[600px] lg:min-w-[480px] md:min-w-[300px]">
              <div className="flex">
                <div className="flex-shrink-0 mr3 flex justify-center items-center w-[32px]">
                  <span className="text-2xl i-carbon-types"></span>
                </div>
                <div>资源</div>
              </div>
            </th>
            <th className="py3">发布者</th>
            <th className="py3 px2 text-center w-max">播放</th>
          </tr>
        </thead>
        <tbody className="resources-table-body divide-y border-b text-sm lt-lg:text-xs">
          {resources.map((r) => (
            <ResourceItem key={`${r.provider}/${r.providerId}`} resource={r}></ResourceItem>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const ResourceItem = memo((props: { resource: Resource<{ tracker: true }> }) => {
  const { resource: r } = props;
  
  return <tr  className="">
  {/* <td className="py2 text-center">
    <a
      href={getDetailHref(r)}
      className="text-link-active"
      aria-label={`Go to resource detail of ${r.title}`}
    >
      {formatInTimeZone(new Date(r.createdAt), 'Asia/Shanghai', 'yyyy-MM-dd HH:mm')}
    </a>
  </td> */}
  <td className="py2 pl3 lt-sm:pl1">
    <div className="flex">
      <div className="flex-shrink-0 mr3 flex justify-center items-center">
        <div className="flex items-center justify-center h-[32px] w-[32px] rounded-full bg-gray-100 text-red-600">
          <span className="text-xl i-carbon-video"></span>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-start">
          <div className="flex-1">
            <span className="mr3">
              {['動畫', '季度全集', '日劇', '特攝'].includes(r.type) ? (
                <>
                  <a
                    href={getPikPakUrlChecker(r.magnet)}
                    className="text-link mr1"
                    aria-label={`Go to download resource of ${r.title}`}
                    target="_blank"
                  >
                    {r.title}
                  </a>
                </>
              ) : (
                <a
                  href={getDetailHref(r)}
                  className="text-link"
                  aria-label={`Go to resource detail of ${r.title}`}
                >
                  {r.title}
                </a>
              )}
            </span>
          </div>
        </div>
        <div className="mt1 flex items-center gap-4">
          {/* <a
            href={`/resources/1?${followSearch({ type: r.type })}`}
            className="inline-block select-none"
            aria-label={`Go to resources list of type ${r.type}`}
          >
            <Tag
              text={r.type in DisplayType ? DisplayType[r.type] : r.type}
              color="bg-light-600 hover:bg-light-700"
              className={`px2 py1 text-xs text-center text-base-600 ${DisplayTypeColor[r.type]} `}
            />
          </a> */}
          <span className="text-xs text-zinc-400">发布于 {formatInTimeZone(new Date(r.createdAt), 'Asia/Shanghai', 'yyyy-MM-dd HH:mm')}</span>
          <span className="text-xs text-zinc-400">上传者 {r.publisher.name}</span>
          {r.fansub && <span className="text-xs text-zinc-400">字幕组 {r.fansub?.name}</span>}
          <a
            href={getDetailHref(r)}
            className="text-link-secondary text-xs"
            aria-label={`Go to resource detail of ${r.title}`}
          ><span className="i-carbon-launch vertical-middle relative bottom-[1px]"></span><span> </span><span className='more'>更多</span></a>
        </div>
      </div>
    </div>
  </td>
  <td className="py2 px2 lt-sm:px0">
    <div className="flex justify-center items-center">
      {r.fansub ? (
        <a
          href={`/resources/1?${followSearch({ fansubId: r.fansub.id })}`}
          className="block w-max"
          aria-label={`Go to resources list of fansub ${r.fansub.name}`}
        >
          <Tag text={r.fansub.name} className={`text-xs hover:bg-gray-300`} />
        </a>
      ) : r.publisher ? (
        <a
          href={`/resources/1?${followSearch({ publisherId: r.publisher.id })}`}
          className="block w-max"
          aria-label={`Go to resources list of publisher ${r.publisher.name}`}
        >
          <Tag text={r.publisher.name} className={`text-xs hover:bg-gray-300`} />
        </a>
      ) : null}
    </div>
  </td>
  <td className="py2 px2">
    <div className="flex gap1 items-center justify-start">
      <a
        href={getPikPakUrlChecker(r.magnet)}
        data-resource-title={r.title}
        className="play i-carbon-play text-2xl text-base-500 hover:text-base-900"
        aria-label="Play resource"
        target="_blank"
      />
      <a
        href={r.magnet + r.tracker}
        data-resource-title={r.title}
        className="download i-carbon-download text-2xl text-base-500 hover:text-base-900"
        aria-label="Download resource"
      />
      {/* <span className="text-xs text-base-400 whitespace-nowrap">{r.size}</span> */}
    </div>
  </td>
</tr>
});