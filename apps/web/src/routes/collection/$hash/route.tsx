import { createFileRoute, redirect } from '@tanstack/react-router';

import Page from '~/pages/collection.$hash/route';
import { fetchCollection, getCanonicalURL } from '~/utils';

const loader = async ({
  location,
  params
}: {
  location: { href: string };
  params: { hash?: string };
}) => {
  try {
    const hash = params.hash!;
    if (!hash) throw redirect({ to: '/' });

    const resp = await fetchCollection(hash);
    if (resp?.ok) {
      return resp;
    }
  } catch (error) {
    console.error(location.href, error);
  }

  throw redirect({ to: '/' });
};

export const Route = createFileRoute('/collection/$hash')({
  loader,
  head: ({ loaderData, params }) => ({
    meta: [
      {
        title:
          (loaderData?.name ? loaderData.name + ' | ' : '') +
          'Anime Garden 動漫花園資源網镜像站 动漫花园动画 BT 资源聚合站'
      },
      {
        name: 'description',
        content: 'Anime Garden 资源收藏夹, 動漫花園資源網镜像站, 动漫花园动画 BT 资源聚合站'
      }
    ],
    links: [{ rel: 'canonical', href: getCanonicalURL(`/collection/${params.hash}`) }]
  }),
  component: CollectionRoute
});

function CollectionRoute() {
  const data = Route.useLoaderData();
  return <Page data={data} />;
}
