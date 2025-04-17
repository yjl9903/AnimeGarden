import clsx from 'clsx';
import { memo } from 'react';
import { NavLink, useLoaderData } from '@remix-run/react';
import { json, redirect, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';

import { Collection, Jsonify } from '@animegarden/client';

import Layout from '~/layouts/Layout';
import ResourcesTable from '~/components/Resources';
import { fetchCollection, getCollectionFeedURL } from '~/utils';
import { inferCollectionItemName } from '~/layouts/Sidebar/Collection';

import { Error } from '../resources.($page)/Error';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  try {
    const hash = params.hash!;
    if (!hash) return redirect('/');

    const resp = await fetchCollection(hash);

    return json({ ...resp });
  } catch (error) {
    console.error('[ERROR]', error);

    return redirect('/');
  }
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const title = data?.name;

  return [
    { title: (title ? title + ' | ' : '') + 'Anime Garden 動漫花園資源網第三方镜像站' },
    { name: 'description', content: 'Anime Garden 動漫花園資源網第三方镜像站' }
  ];
};

export default function Collections() {
  const data = useLoaderData<typeof loader>();

  if (!data) return <Error></Error>;

  const filters = data.filters!;
  const results = data.results!;

  return (
    <Layout timestamp={data.timestamp} feedURL={getCollectionFeedURL(data.hash!)}>
      <div className="w-full pt-12 pb-24">
        <div className="space-y-8">
          {results.map((item, idx) => (
            <div key={filters[idx].searchParams} className={clsx('py-4 rounded-md border drop-md')}>
              <div className="mb-4 px-4 pb-4 border-b">
                <h2 className="text-xl font-bold">
                  <NavLink
                    to={`/resources/1${filters[idx].searchParams}`}
                    className="text-link-active"
                  >
                    <CollectionItemTitle item={filters[idx]}></CollectionItemTitle>
                  </NavLink>
                </h2>
              </div>
              <div className="px-4">
                <ResourcesTable
                  resources={item.resources}
                  page={1}
                  complete={item.complete}
                  link={(page) => `/resources/${page}${filters[idx].searchParams}`}
                ></ResourcesTable>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

const CollectionItemTitle = memo((props: { item: Jsonify<Collection<true>['filters'][0]> }) => {
  const item = props.item;
  const name = inferCollectionItemName(props.item);

  const fansub = name.fansubs?.join(' ');
  const title = item.name
    ? item.name
    : name.title
      ? name.title + (fansub ? ' 字幕组:' + fansub : '')
      : name.text!;

  return <>{title}</>;
});
