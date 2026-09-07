import { createFileRoute, isNotFound, redirect, useLocation } from '@tanstack/react-router';
import { useSuspenseQuery, type QueryClient } from '@tanstack/react-query';

import Page from '~/pages/subject.$subject.($page)/route';
import { buildSubjectPageHead } from '~/pages/subject.$subject.($page)/seo';
import NotFoundPage, { buildNotFoundPageHeaders, throwNotFoundPage } from '~/pages/not-found/route';
import { buildNotFoundPageHead } from '~/pages/not-found/seo';
import { calendarQueryOptions, resourcesQueryOptions, subjectQueryOptions } from '~/query';
import { getTrackingError, serializeError } from '~/utils';
import { ResponseCacheControl, setCacheControl, setErrorResponse } from '~/utils/response';
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

export const loader = async ({
  context,
  location,
  params
}: {
  context: { queryClient: QueryClient };
  location: { href: string; searchStr: string };
  params: { subject?: string; page?: string };
}) => {
  if (params.page !== undefined) {
    throw redirect({ href: `/subject/${params.subject}${location.searchStr}` });
  }

  const subjectId = +params.subject!;
  if (!Number.isSafeInteger(subjectId) || subjectId <= 0) {
    throwNotFoundPage('subject');
  }

  const resourceFilter = getSubjectResourcesFilter(subjectId);
  const [subjectResp, resourcesResp] = await Promise.all([
    context.queryClient.ensureQueryData(subjectQueryOptions(subjectId)),
    context.queryClient.ensureQueryData(resourcesQueryOptions(resourceFilter)),
    context.queryClient.ensureQueryData(calendarQueryOptions())
  ]);

  if (!subjectResp.ok) {
    if (subjectResp.code !== 'NOT_FOUND') {
      throw new Error(subjectResp.error.message);
    }
    throwNotFoundPage('subject');
  }
  const subject = subjectResp.subject;

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
  head: ({ loaderData, params, match }) =>
    loaderData?.subject
      ? buildSubjectPageHead(loaderData.subject, loaderData.filter, params.subject!)
      : isNotFound(match.error)
        ? buildNotFoundPageHead()
        : {},
  headers: ({ match }) => buildNotFoundPageHeaders(match.error),
  notFoundComponent: NotFoundPage,
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
