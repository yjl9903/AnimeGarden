import clsx from 'clsx';
import { memo } from 'react';
import { Link as NavLink } from '@tanstack/react-router';

import { Collection, Jsonify } from '@animegarden/client';

import Layout from '~/layouts/Layout';
import ResourcesTable from '~/components/Resources';
import { inferCollectionItemName } from '~/layouts/Sidebar/Collection';
import { getCollectionFeedURL } from '~/utils';

import { Error } from '../resources.($page)/Error';

export default function Collections({ data }: { data: any }) {
  if (!data) {
    return (
      <Error
        tracking={{
          error: 'collection-render-failed'
        }}
      ></Error>
    );
  }

  const filters = data.filters!;
  const results = data.results!;

  return (
    <Layout timestamp={data.timestamp} feedURL={getCollectionFeedURL(data.hash!)}>
      <div className="w-full pt-13 pb-24">
        <div className="space-y-8">
          {results.map((item: any, idx: number) => (
            <div key={filters[idx].searchParams} className={clsx('py-4 rounded-md border drop-md')}>
              <div className="mb-4 px-4 pb-4 border-b">
                <h2 className="text-xl font-bold">
                  <NavLink
                    to={`/resources/1${filters[idx].searchParams}` as any}
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

const CollectionItemTitle = memo((props: { item: Collection<true>['filters'][0] }) => {
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
