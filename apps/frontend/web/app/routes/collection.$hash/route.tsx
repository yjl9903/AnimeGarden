import { json, redirect, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

import Layout from '~/layouts/Layout';
import { fetchCollection } from '~/utils';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const title = data?.name;

  return [
    { title: (title ? title + ' 最新资源 | ' : '') + 'Anime Garden 動漫花園資源網第三方镜像站' },
    { name: 'description', content: 'Anime Garden 動漫花園資源網第三方镜像站' }
  ];
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const hash = params.hash!;
  if (!hash) return redirect('/');

  const resp = await fetchCollection(hash);

  return json({ ...resp });
};

export default function Collections() {
  const data = useLoaderData<typeof loader>();

  return (
    <Layout>
      <div className="w-full pt-12 pb-24"></div>
    </Layout>
  );
}
