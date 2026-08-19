import { createFileRoute, redirect } from '@tanstack/react-router';
import { useSuspenseQuery, type QueryClient } from '@tanstack/react-query';

import Page from '~/pages/collection.$hash/route';
import { buildCollectionPageHead } from '~/pages/collection.$hash/seo';
import { calendarQueryOptions, collectionQueryOptions } from '~/query';
import { ResponseCacheControl, setCacheControl } from '~/utils/response';

const loader = async ({
  context,
  params
}: {
  context: { queryClient: QueryClient };
  params: { hash?: string };
}) => {
  const hash = params.hash!;
  if (!hash) throw redirect({ to: '/' });

  const [resp] = await Promise.all([
    context.queryClient.ensureQueryData(collectionQueryOptions(hash)),
    context.queryClient.ensureQueryData(calendarQueryOptions())
  ]);
  if (resp?.ok) {
    await setCacheControl(ResponseCacheControl.List);
    return resp;
  }

  throw redirect({ to: '/' });
};

export const Route = createFileRoute('/collection/$hash')({
  loader,
  head: ({ loaderData, params }) => buildCollectionPageHead(loaderData?.name, params.hash!),
  component: CollectionRoute
});

function CollectionRoute() {
  const params = Route.useParams();
  const { data } = useSuspenseQuery(collectionQueryOptions(params.hash!));
  return <Page data={data} />;
}
