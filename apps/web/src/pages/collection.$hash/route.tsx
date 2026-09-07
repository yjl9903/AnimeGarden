import clsx from 'clsx';
import { memo } from 'react';
import { Link } from '@tanstack/react-router';

import type { CollectionData } from '@animegarden/client';

import Layout from '~/layouts/Layout';
import ResourcesTable from '~/components/Resources';
import { useInferCollectionItemName } from '~/layouts/Sidebar/Collection';
import { getCollectionFeedURL } from '~/utils';
import { getResourcesRouteLink } from '~/utils/routes';

import { Error } from '../resources.($page)/Error';

export default function Collections({ data }: { data?: CollectionData }) {
  if (!data) {
    return (
      <Error
        tracking={{
          error: 'collection-render-failed'
        }}
      ></Error>
    );
  }

  const { filters, results } = data;

  return (
    <Layout timestamp={data.timestamp} feedURL={getCollectionFeedURL(data.hash!)}>
      <div className="w-full pt-13 pb-24">
        <div className="space-y-8">
          {results.map((item, idx) => (
            <div key={filters[idx].searchParams} className={clsx('py-4 rounded-md border drop-md')}>
              <div className="mb-4 px-4 pb-4 border-b">
                <h2 className="text-xl font-bold">
                  <Link
                    {...getResourcesRouteLink(1, filters[idx].searchParams)}
                    className="text-link-active"
                  >
                    <CollectionItemTitle item={filters[idx]}></CollectionItemTitle>
                  </Link>
                </h2>
              </div>
              <div className="px-4">
                <ResourcesTable
                  resources={item.resources}
                  page={item.pagination.page}
                  complete={item.pagination.complete}
                  link={(page) => getResourcesRouteLink(page, filters[idx].searchParams)}
                ></ResourcesTable>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

const CollectionItemTitle = memo((props: { item: CollectionData['filters'][number] }) => {
  const item = props.item;
  const name = useInferCollectionItemName(props.item);

  const fansub = name.fansubs?.join(' ');
  const title = item.name
    ? item.name
    : name.title
      ? name.title + (fansub ? ' 字幕组:' + fansub : '')
      : name.text!;

  return <>{title}</>;
});
