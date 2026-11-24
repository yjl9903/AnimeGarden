import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery, type QueryClient } from '@tanstack/react-query';

import { SupportProviders } from '@animegarden/client';

import { RESOURCE_DETAIL_PAGES_ENABLED } from '~/utils/constants';
import Page from '~/pages/detail.$provider.$providerId/route';
import { buildDetailPageHead } from '~/pages/detail.$provider.$providerId/seo';
import NotFoundPage, { buildNotFoundPageHeaders, throwNotFoundPage } from '~/pages/not-found/route';
import { buildNotFoundPageHead } from '~/pages/not-found/seo';
import { ResponseCacheControl, setCacheControl } from '~/utils/response';
import { calendarQueryOptions, resourceDetailQueryOptions, subjectQueryOptions } from '~/query';

export const loader = async ({
  context,
  params
}: {
  context: { queryClient: QueryClient };
  params: { provider?: string; providerId?: string };
}) => {
  // 暂时下架：恢复 Web 的 RESOURCE_DETAIL_PAGES_ENABLED 后重新启用原 loader 和页面 SEO。
  if (!RESOURCE_DETAIL_PAGES_ENABLED) throwNotFoundPage('resource');

  const { provider, providerId } = params;
  if (provider && providerId && SupportProviders.includes(provider)) {
    const [data] = await Promise.all([
      context.queryClient.ensureQueryData(resourceDetailQueryOptions(provider, providerId)),
      context.queryClient.ensureQueryData(calendarQueryOptions())
    ]);
    if (data?.ok && data?.resource) {
      const subject = data.resource.subjectId
        ? (await context.queryClient.ensureQueryData(subjectQueryOptions(data.resource.subjectId)))
            .subject
        : undefined;

      await setCacheControl(ResponseCacheControl.Detail);
      return { ...data, subject };
    }

    if (data?.code === 'NOT_FOUND') {
      throwNotFoundPage('resource');
    }

    throw new Error(`Failed loading resource detail: ${provider}:${providerId}`);
  }

  throwNotFoundPage('resource');
};

export const Route = createFileRoute('/detail/$provider/$providerId')({
  loader,
  head: ({ loaderData, params }) =>
    loaderData?.resource
      ? buildDetailPageHead({
          resource: loaderData.resource,
          description: loaderData.description,
          fallbackDescription: loaderData.detail?.description,
          subject: loaderData.subject,
          provider: params.provider!,
          providerId: params.providerId!
        })
      : buildNotFoundPageHead(),
  headers: ({ match }) => buildNotFoundPageHeaders(match.error),
  notFoundComponent: NotFoundPage,
  component: DetailRoute
});

function DetailRoute() {
  const params = Route.useParams();
  const { data } = useSuspenseQuery(
    resourceDetailQueryOptions(params.provider!, params.providerId!)
  );
  return <Page data={data} />;
}
