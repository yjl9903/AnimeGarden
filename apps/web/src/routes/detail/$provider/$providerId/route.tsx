import { createFileRoute, redirect } from '@tanstack/react-router';
import { useSuspenseQuery, type QueryClient } from '@tanstack/react-query';

import { SupportProviders } from '@animegarden/client';

import Page from '~/pages/detail.$provider.$providerId/route';
import { buildDetailPageHead } from '~/pages/detail.$provider.$providerId/seo';
import { ResponseCacheControl, setCacheControl } from '~/utils/response';
import { calendarQueryOptions, resourceDetailQueryOptions, subjectQueryOptions } from '~/query';

const loader = async ({
  context,
  params
}: {
  context: { queryClient: QueryClient };
  params: { provider?: string; providerId?: string };
}) => {
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
  }

  throw redirect({ to: '/' });
};

export const Route = createFileRoute('/detail/$provider/$providerId')({
  loader,
  head: ({ loaderData, params }) =>
    buildDetailPageHead({
      resource: loaderData?.resource,
      description: loaderData?.description,
      fallbackDescription: loaderData?.detail?.description,
      subject: loaderData?.subject,
      provider: params.provider!,
      providerId: params.providerId!
    }),
  component: DetailRoute
});

function DetailRoute() {
  const params = Route.useParams();
  const { data } = useSuspenseQuery(
    resourceDetailQueryOptions(params.provider!, params.providerId!)
  );
  return <Page data={data} />;
}
