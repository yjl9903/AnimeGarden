import { createFileRoute, redirect, useLocation } from '@tanstack/react-router';
import { truncate } from '@animegarden/shared';

import Page from '~/pages/subject.$subject.($page)/route';
import { APP_HOST } from '~build/env';
import { generateTitleFromFilter } from '~/utils/server/meta';
import { fetchResources, getCanonicalURL, getTrackingError, serializeError } from '~/utils';
import { setResponseStatus } from '~/utils/response';
import { getSubjectById, getSubjectDisplayName } from '~/utils/subjects';
import { groupResourcesByFansub } from '~/pages/subject.$subject.($page)/utils';

const loader = async ({
  location,
  params
}: {
  location: { href: string };
  params: { subject?: string; page?: string };
}) => {
  if (params.page !== undefined) {
    throw redirect({ href: `/subject/${params.subject}` });
  }

  const subjectId = +params.subject!;
  const subject = getSubjectById(subjectId);

  const resourceFilter = {
    subject: subjectId,
    subjects: undefined,
    page: 1,
    pageSize: 1000,
    types: ['动画', '合集']
  };

  try {
    const { ok, resources, pagination, filter, timestamp, error } =
      await fetchResources(resourceFilter);

    if (error) {
      console.error(location.href, error);
    }

    if (!ok) {
      await setResponseStatus(500);
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
  } catch (error) {
    console.error(location.href, error);
    await setResponseStatus(500);

    return {
      ok: false,
      subjectId,
      subject,
      resources: groupResourcesByFansub([]),
      pagination: undefined,
      filter: resourceFilter,
      timestamp: undefined,
      error: serializeError(error)
    };
  }
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
            (name ? name + ' 最新资源' : generateTitleFromFilter(loaderData?.filter ?? {})) +
            ' | Anime Garden 動漫花園資源網镜像站 动漫花园动画 BT 资源聚合站'
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
  const data = Route.useLoaderData();
  const params = Route.useParams();

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
