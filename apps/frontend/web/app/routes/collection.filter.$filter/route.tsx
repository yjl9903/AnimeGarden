import { json, redirect, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { NavLink, useLoaderData } from '@remix-run/react';

import Layout from '~/layouts/Layout';
import { Collection } from '~/states/collection';
import { safeParseJSON } from '~/utils/json';
import { fetchResources } from '~/utils/fetch';
import ResourcesTable from '~/components/Resources';
import clsx from 'clsx';

export const meta: MetaFunction = () => {
  return [
    { title: 'Anime Garden 動漫花園資源網第三方镜像站' },
    { name: 'description', content: '}Anime Garden 動漫花園資源網第三方镜像站' }
  ];
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  console.log(params.filter);
  const filter = safeParseJSON<Collection>(params.filter, { decode: true });
  if (filter.result) {
    const collection = filter.result;

    try {
      const resp = await Promise.all(
        collection.items.map(async (item) => ({
          item,
          result: await fetchResources(item)
        }))
      );

      return json({
        data: {
          name: collection.name,
          items: resp
        }
      });
    } catch (error) {
      console.error(error);
    }
  }

  return redirect(`/`);
};

export default function Resources() {
  const { data: collection } = useLoaderData<typeof loader>();

  return (
    <Layout>
      <div className="w-full pt-12 pb-24">
        <div className="space-y-8">
          {collection.items.map((item) => (
            <div key={item.item.searchParams} className={clsx('py-4 rounded-md border drop-md')}>
              <div className="mb-4 px-4 pb-4 border-b">
                <h2 className="text-xl font-bold">
                  <NavLink
                    to={`/resources/1${item.item.searchParams}`}
                    className="text-link-active"
                  >
                    {item.item.name}
                  </NavLink>
                </h2>
              </div>
              <div className="px-4">
                <ResourcesTable resources={item.result.resources}></ResourcesTable>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
