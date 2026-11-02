import { useSuspenseQuery, type QueryClient } from '@tanstack/react-query';
import { createFileRoute, isNotFound, useLocation } from '@tanstack/react-router';

import Page from '~/pages/subject.$subject.($page)/route';
import NotFoundPage, { buildNotFoundPageHeaders, throwNotFoundPage } from '~/pages/not-found/route';
import { buildNotFoundPageHead } from '~/pages/not-found/seo';
import { buildSubjectPageHead } from '~/pages/subject.$subject.($page)/seo';
import { groupResourcesByFansub } from '~/pages/subject.$subject.($page)/utils';

import { resourcesQueryOptions, subjectQueryOptions, type ResourcesQueryInput } from '~/query';
import { getTrackingError, serializeError } from '~/utils';
import { ResponseCacheControl, setCacheControl, setErrorResponse } from '~/utils/response';

export const loader = async ({
  context,
  location,
  params
}: {
  context: { queryClient: QueryClient };
  location: { href: string; searchStr: string };
  params: { subject?: string };
}) => {
  const subjectId = +params.subject!;
  if (!Number.isSafeInteger(subjectId) || subjectId <= 0) {
    throwNotFoundPage('subject');
  }

  const requestedFilter = {
    subject: subjectId,
    limit: 1000,
    types: ['动画', '合集']
  } satisfies ResourcesQueryInput;

  const [subjectResp, resourcesResp] = await Promise.all([
    context.queryClient.query(subjectQueryOptions(subjectId)),
    context.queryClient.query(resourcesQueryOptions(requestedFilter))
  ]);

  if (!subjectResp.ok) {
    if (subjectResp.code !== 'NOT_FOUND') {
      throw new Error(subjectResp.error.message);
    }
    throwNotFoundPage('subject');
  }
  const subject = subjectResp.subject;

  const { ok, resources, timestamp, error } = resourcesResp;

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
    filter: requestedFilter,
    subjectId,
    subject,
    resources: groupResourcesByFansub(resources),
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
  const resourcesQuery = useSuspenseQuery(resourcesQueryOptions(loaderData.filter));
  const resourcesData = resourcesQuery.data;
  // Keep the previous overview visible if its single-batch refresh fails.
  const error = resourcesData.error ?? resourcesQuery.error ?? undefined;
  const data = {
    ...loaderData,
    ...resourcesData,
    subjectId: loaderData.subjectId,
    subject: subjectData.subject,
    resources: groupResourcesByFansub(resourcesData.resources),
    error: serializeError(error)
  };

  return (
    <Page
      data={data}
      subjectParam={params.subject!}
      searchStr={location.searchStr}
      path={`${location.pathname}${location.searchStr}`}
      renderError={getTrackingError(error, 'subject-render-failed')}
    />
  );
}
