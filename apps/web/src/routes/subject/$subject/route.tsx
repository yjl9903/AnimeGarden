import { createFileRoute, redirect, useLocation } from '@tanstack/react-router';
import { useSuspenseQuery, type QueryClient } from '@tanstack/react-query';
import { truncate } from '@animegarden/shared';

import Page from '~/pages/subject.$subject.($page)/route';
import { APP_HOST } from '~build/env';
import { generateTitleFromFilter } from '~/utils/server/meta';
import { calendarQueryOptions, resourcesQueryOptions, subjectQueryOptions } from '~/query';
import { getCanonicalURL, getTrackingError, serializeError } from '~/utils';
import { ResponseCacheControl, setCacheControl, setErrorResponse } from '~/utils/response';
import { getSubjectDisplayName } from '~/utils/subject';
import { groupResourcesByFansub } from '~/pages/subject.$subject.($page)/utils';

function getSubjectResourcesFilter(subjectId: number) {
  return {
    subject: subjectId,
    subjects: undefined,
    page: 1,
    pageSize: 1000,
    types: ['动画', '合集']
  };
}

const loader = async ({
  context,
  location,
  params
}: {
  context: { queryClient: QueryClient };
  location: { href: string };
  params: { subject?: string; page?: string };
}) => {
  if (params.page !== undefined) {
    throw redirect({ href: `/subject/${params.subject}` });
  }

  const subjectId = +params.subject!;
  const resourceFilter = getSubjectResourcesFilter(subjectId);
  const [subjectResp, resourcesResp] = await Promise.all([
    context.queryClient.ensureQueryData(subjectQueryOptions(subjectId)),
    context.queryClient.ensureQueryData(resourcesQueryOptions(resourceFilter)),
    context.queryClient.ensureQueryData(calendarQueryOptions())
  ]);

  const subject = subjectResp.subject;
  if (!subjectResp.ok || !subject) {
    await setErrorResponse(404);
    return {
      ok: false,
      subjectId,
      subject,
      resources: [],
      pagination: undefined,
      filter: undefined,
      timestamp: undefined,
      error: undefined
    };
  }

  const { ok, resources, pagination, filter, timestamp, error } = resourcesResp;

  if (error) {
    console.error(location.href, error);
  }

  if (!ok) {
    await setErrorResponse(500);
  } else {
    await setCacheControl(ResponseCacheControl.List);
  }

  return {
    ok,
    subjectId,
    subject,
    resources: groupResourcesByFansub(resources),
    pagination,
    filter,
    timestamp,
    error: serializeError(error)
  };
};

export const Route = createFileRoute('/subject/$subject')({
  loader,
  head: ({ loaderData, params }) => {
    const subject = loaderData?.subject;
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

    const subjectImage = subject?.poster;
    if (subjectImage) {
      og.push({
        name: 'og:image',
        content: subjectImage
      });
    }

    return {
      meta: [
        {
          title:
            (name
              ? name + ' 最新资源'
              : generateTitleFromFilter(
                  loaderData?.filter ?? {},
                  subject ? { [subject.id]: subject } : {}
                )) + ' | Anime Garden 動漫花園資源網镜像站 动漫花园动画 BT 资源聚合站'
        },
        {
          name: 'description',
          content:
            name && subject?.summary
              ? `${name}: ${truncate(subject.summary.replace(/\n/g, ' '), 120)}`
              : name
                ? `${name} | Anime Garden 動漫花園資源網镜像站 动漫花园动画 BT 资源聚合站`
                : `最新动画资源 | Anime Garden 動漫花園資源網镜像站 动漫花园动画 BT 资源聚合站`
        },
        ...og
      ],
      links: [{ rel: 'canonical', href: getCanonicalURL(`/subject/${params.subject}`) }]
    };
  },
  component: SubjectRoute
});

function SubjectRoute() {
  const location = useLocation();
  const loaderData = Route.useLoaderData();
  const params = Route.useParams();
  const { data: subjectData } = useSuspenseQuery(subjectQueryOptions(loaderData.subjectId));
  const { data: resourcesData } = useSuspenseQuery(
    resourcesQueryOptions(getSubjectResourcesFilter(loaderData.subjectId))
  );
  const data = {
    ...loaderData,
    ...resourcesData,
    subjectId: loaderData.subjectId,
    subject: subjectData.subject,
    resources: groupResourcesByFansub(resourcesData.resources),
    error: serializeError(resourcesData.error)
  };

  return (
    <Page
      data={data}
      subjectParam={params.subject!}
      searchStr={location.searchStr}
      path={`${location.pathname}${location.searchStr}`}
      renderError={getTrackingError(data.error, 'subject-render-failed')}
    />
  );
}
