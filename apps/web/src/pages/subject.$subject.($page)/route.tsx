import { useEffect, useMemo } from 'react';
import { Link as NavLink } from '@tanstack/react-router';

import { stringifyURLSearch } from '@animegarden/client';

import Layout from '~/layouts/Layout';
import Resources from '~/components/Resources';
import {
  getFeedURL,
  getOpenFeedTrackEvent,
  getTrackingError,
  track,
  trackFetchResourcesError
} from '~/utils';
import { getAllSubjectNames } from '~/utils/subject';

import { Error } from '../resources.($page)/Error';

import { SubjectCard } from './subject';
import { groupResourcesByFansub } from './utils';

export function HydrateFallback() {
  return <div></div>;
}

export default function SubjectIndex({
  data,
  subjectParam,
  searchStr,
  path,
  renderError
}: {
  data: {
    ok: boolean;
    subjectId: number;
    subject: any;
    resources: ReturnType<typeof groupResourcesByFansub>;
    pagination?: { complete?: boolean };
    timestamp?: Date;
    error: any;
  };
  subjectParam: string;
  searchStr: string;
  path: string;
  renderError: string;
}) {
  const { ok, subjectId, subject, resources, pagination, timestamp, error } = data;
  const feedURL = useMemo(() => {
    const search = new URLSearchParams(searchStr);
    search.set('subject', subjectParam);
    search.sort();
    return getFeedURL(`?${search.toString()}`);
  }, [searchStr, subjectParam]);
  const fallbackSearchURL = useMemo(() => {
    if (!subject) return '/resources/1';
    const search = stringifyURLSearch({
      include: getAllSubjectNames(subject!)
    });
    return `/resources/1?${search.toString()}`;
  }, [subject]);

  useEffect(() => {
    if (!error || !ok || !subject) return;

    trackFetchResourcesError({
      path,
      error: getTrackingError(error, 'subject-fetch-failed')
    });
  }, [error, ok, path, subject]);

  return (
    <Layout feedURL={feedURL} timestamp={timestamp} heading={false}>
      <div className="w-full pt-13 pb-24">
        {ok && subject ? (
          <>
            <SubjectCard subject={subject}></SubjectCard>
            <div className="flex flex-col gap-12">
              {resources.map((group) => (
                <div
                  key={
                    group.fansub?.id
                      ? `fansub-${group.fansub.id}`
                      : `publisher-${group.publisher.id}`
                  }
                >
                  <FansubGroupResources
                    subject={subject?.id!}
                    group={group! as any}
                    complete={pagination?.complete ?? false}
                  ></FansubGroupResources>
                </div>
              ))}
            </div>
            {resources.length === 0 && (
              <div className="h-20 text-2xl text-orange-700/80 flex items-center justify-center">
                <span className="mr2 i-carbon-search" />
                <span className="mr2">暂时未索引到相应资源</span>
                <NavLink
                  to={fallbackSearchURL}
                  className="text-link"
                  onClick={() => {
                    track('subject.fallback-search', {
                      subject: 'subject:' + subject.id
                    });
                  }}
                >
                  前往搜索
                </NavLink>
              </div>
            )}
          </>
        ) : (
          <Error
            message={
              !subject ? (
                <span>
                  未找到{' '}
                  <a
                    href={`https://bgm.tv/subject/${subjectId}`}
                    target="_blank"
                    className="text-link"
                  >
                    番剧 {subjectId}
                  </a>
                </span>
              ) : undefined
            }
            tracking={{
              error: !subject ? 'subject-not-found' : renderError
            }}
          ></Error>
        )}
      </div>
    </Layout>
  );
}

function FansubGroupResources({
  subject,
  group,
  complete
}: {
  subject: number;
  group: ReturnType<typeof groupResourcesByFansub>[number];
  complete: boolean;
}) {
  const feedURL = getFeedURL(
    `?subject=${subject}&${group.fansub ? `fansub=${group.fansub.name}` : `publisher=${group.publisher.name}`}`
  );

  return (
    <>
      <h2 className="text-2xl font-bold flex items-center gap-2 pr-2">
        <NavLink
          to={
            `/resources/1?subject=${subject}&${group.fansub ? `fansub=${group.fansub.name}` : `publisher=${group.publisher.name}`}` as any
          }
          className="text-link-active"
        >
          {group.fansub?.name ?? group.publisher.name}
        </NavLink>
        <span className="block flex-auto"></span>
        <a
          href={feedURL}
          {...getOpenFeedTrackEvent(feedURL)}
          target="_blank"
          className="flex items-center cursor-pointer text-base font-light text-[#ee802f] border-b-2 border-b-transparent hover:(text-[#ff7800] border-b-[#ff7800])"
        >
          <span className="i-mdi-rss text-sm mr-1 relative top-[1px]"></span>
          <span>RSS</span>
        </a>
      </h2>
      <Resources resources={group.resources as any} columns={{ fansub: false }}></Resources>
      {!complete && (
        <div className="py-4 px-8 lt-xl:px-2 text-right border-b">
          <NavLink
            to={
              `/resources/1?subject=${subject}&${group.fansub ? `fansub=${group.fansub.name}` : `publisher=${group.publisher.name}`}` as any
            }
            className="text-link"
          >
            搜索更多资源...
          </NavLink>
        </div>
      )}
    </>
  );
}
