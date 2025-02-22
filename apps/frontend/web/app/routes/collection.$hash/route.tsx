import { json, redirect, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';

import Layout from '~/layouts/Layout';
import { fetchCollection } from '~/utils';

export const meta: MetaFunction = () => {
  return [
    { title: 'Anime Garden 動漫花園資源網第三方镜像站' },
    { name: 'description', content: 'Anime Garden 動漫花園資源網第三方镜像站' }
  ];
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const hash = params.hash!;
  if (!hash) return redirect('/');

  const resp = await fetchCollection(hash);

  return json({});
};

export default function Collections() {
  return (
    <Layout>
      <div className="w-full pt-12 pb-24"></div>
    </Layout>
  );
}
