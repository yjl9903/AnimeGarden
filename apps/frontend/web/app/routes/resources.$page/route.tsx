import { useLoaderData } from '@remix-run/react';
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';

import { parseSearchURL, Resource } from 'animegarden';

import Layout from '@/layouts/Layout';
import Resources from '@/components/Resources';
import { fetchResources } from '@/utils';

import { Filter } from './Filter';

export const meta: MetaFunction = () => {
  return [
    { title: 'Anime Garden 動漫花園資源網第三方镜像站' },
    { name: 'description', content: '}Anime Garden 動漫花園資源網第三方镜像站' }
  ];
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const parsed = parseSearchURL(url.searchParams, { pageSize: 80 });
  const { ok, resources, filter, timestamp } = await fetchResources({
    ...parsed,
    page: 1,
  });
  
  return json({ ok, resources: resources as Resource<{ tracker: true }>[], filter, timestamp });
};

export default function ResourcesIndex() {
  const { ok, resources, filter, timestamp } = useLoaderData<typeof loader>();

  return (
    <Layout>
      <div className="w-full pt-12 pb-24">
        <Filter filter={filter as any}></Filter>
        <Resources resources={resources}></Resources>
      </div>
    </Layout>
  );
}
