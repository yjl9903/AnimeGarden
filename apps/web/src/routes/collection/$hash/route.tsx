import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery, type QueryClient } from '@tanstack/react-query';

import Page from '~/pages/collection.$hash/route';
import { buildCollectionPageHead } from '~/pages/collection.$hash/seo';
import NotFoundPage, { buildNotFoundPageHeaders, throwNotFoundPage } from '~/pages/not-found/route';
import { buildNotFoundPageHead } from '~/pages/not-found/seo';
import { calendarQueryOptions, collectionQueryOptions } from '~/query';
import { ResponseCacheControl, setCacheControl } from '~/utils/response';

export const loader = async ({
  context,
  params
}: {
  context: { queryClient: QueryClient };
  params: { hash?: string };
}) => {
  const hash = params.hash!;
  if (!hash) {
    throwNotFoundPage('collection');
  }

  const [resp] = await Promise.all([
    context.queryClient.ensureQueryData(collectionQueryOptions(hash)),
    context.queryClient.ensureQueryData(calendarQueryOptions())
  ]);
  if (resp?.ok) {
    await setCacheControl(ResponseCacheControl.List);
    return resp;
  }

  if (resp?.code === 'NOT_FOUND') {
    throwNotFoundPage('collection');
  }

  throw new Error(`Failed loading collection: ${hash}`);
};

export const Route = createFileRoute('/collection/$hash')({
  loader,
  head: ({ loaderData, params }) =>
    loaderData?.ok
      ? buildCollectionPageHead(loaderData.name, params.hash!)
      : buildNotFoundPageHead(),
  headers: ({ match }) => buildNotFoundPageHeaders(match.error),
  notFoundComponent: NotFoundPage,
  component: CollectionRoute
});

function CollectionRoute() {
  const params = Route.useParams();
  const { data } = useSuspenseQuery(collectionQueryOptions(params.hash!));
  return <Page data={data.ok ? data : undefined} />;
}
