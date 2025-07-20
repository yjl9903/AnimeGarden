import { useMemo } from 'react';
import {
  type ClientLoaderFunction,
  NavLink,
  redirect,
  useLoaderData,
  useLocation,
  useParams
} from '@remix-run/react';
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';

import { APP_HOST } from '~build/env';

import Layout from '~/layouts/Layout';
import Resources from '~/components/Resources';
import { usePreferFansub } from '~/states';
import { fetchResources, getFeedURL } from '~/utils';
import { generateTitleFromFilter } from '~/utils/server/meta';
import {
  type FullBangumiItem,
  getSubjectById,
  getSubjectDisplayName,
  waitForSubjectsLoaded
} from '~/utils/subjects';

import { Error } from '../resources.($page)/Error';

import { SubjectCard } from './subject';
import { groupResourcesByFansub } from './utils';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  // Redirect to the main page
  if (params.page !== undefined) {
    return redirect(`/subject/${params.subject}`);
  }

  const subject = +params.subject!;

  const { ok, resources, pagination, filter, timestamp } = await fetchResources({
    subject,
    subjects: undefined,
    page: 1,
    pageSize: 1000,
    types: ['动画', '合集']
  });

  return {
    ok,
    subject: getSubjectById(subject) as FullBangumiItem,
    resources: groupResourcesByFansub(resources),
    pagination,
    filter,
    timestamp
  };
};

export const meta: MetaFunction<typeof loader> = ({ location, data, params }) => {
  const subject = data?.subject;
  const name = getSubjectDisplayName(subject);

  const og = subject
    ? [
        {
          name: 'og:title',
          content: name + ' 最新资源'
        },
        {
          name: 'og:url',
          content: `https://${APP_HOST}/subject/${subject.id}`
        },
        {
          name: 'og:type',
          content: 'video.episode'
        },
        {
          name: 'og:logo',
          content: '/favicon.svg'
        }
      ]
    : [];

  const subjectImage = subject?.bangumi?.images.large;
  if (subjectImage) {
    og.push({
      name: 'og:image',
      content: subjectImage
    });
  }

  return [
    {
      title:
        (name ? name + ' 最新资源' : generateTitleFromFilter(data?.filter ?? {})) +
        ' | Anime Garden 動漫花園資源網第三方镜像站'
    },
    {
      name: 'description',
      content: `${name}: ${subject?.summary ?? '...'}`
    },
    ...og
  ];
};

export const clientLoader: ClientLoaderFunction = async ({ serverLoader }) => {
  const serverData = await serverLoader<typeof loader>();
  if (serverData?.filter?.subjects) {
    await waitForSubjectsLoaded();
  }
  return serverData;
};
clientLoader.hydrate = true;

export function HydrateFallback() {
  return <div></div>;
}

export default function SubjectIndex() {
  const params = useParams();
  const location = useLocation();
  const { ok, subject, resources, pagination, filter, timestamp } = useLoaderData<typeof loader>();
  const feedURL = useMemo(() => {
    const search = new URLSearchParams(location.search);
    search.set('subject', params.subject!);
    search.sort();
    return getFeedURL(`?${search.toString()}`);
  }, [location]);

  usePreferFansub(filter?.fansubs);

  return (
    <Layout feedURL={feedURL} timestamp={timestamp}>
      <div className="w-full pt-13 pb-24">
        {ok ? (
          <>
            <SubjectCard subject={subject!}></SubjectCard>
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
          </>
        ) : (
          <Error></Error>
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
  return (
    <>
      <h3 className="text-2xl font-bold flex items-center gap-2 pr-2">
        <NavLink
          to={`/resources/1?subject=${subject}&${group.fansub ? `fansub=${group.fansub.name}` : `publisher=${group.publisher.name}`}`}
          className="text-link-active"
        >
          {group.fansub?.name ?? group.publisher.name}
        </NavLink>
        <div className="flex-auto"></div>
        <a
          href={getFeedURL(
            `?subject=${subject}&${group.fansub ? `fansub=${group.fansub.name}` : `publisher=${group.publisher.name}`}`
          )}
          target="_blank"
          className="flex items-center cursor-pointer text-base font-light text-[#ee802f] border-b-2 border-b-transparent hover:(text-[#ff7800] border-b-[#ff7800])"
        >
          <span className="i-mdi-rss text-sm mr-1"></span>
          <span>RSS</span>
        </a>
      </h3>
      <Resources resources={group.resources as any} columns={{ fansub: false }}></Resources>
      {!complete && (
        <div className="py-4 px-8 lt-xl:px-2 text-right border-b">
          <NavLink
            to={`/resources/1?subject=${subject}&${group.fansub ? `fansub=${group.fansub.name}` : `publisher=${group.publisher.name}`}`}
            className="text-link"
          >
            搜索更多资源...
          </NavLink>
        </div>
      )}
    </>
  );
}
