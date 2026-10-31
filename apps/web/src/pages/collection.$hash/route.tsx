import { memo } from 'react';
import { Link } from '@tanstack/react-router';

import type { CollectionData } from '@animegarden/client';
import { stringifyURLSearch } from '@animegarden/client';

import Layout from '~/layouts/Layout';
import ResourcesTable from '~/components/Resources';
import { ResourcesLoadMoreLink } from '~/components/Resources/load-more';
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
        <div className="flex flex-col gap-12">
          {results.map((item, idx) => (
            <section key={filters[idx].searchParams}>
              <div className="mb-4 pb-4 border-b pl-4 lt-sm:pl-2">
                <h2 className="text-xl font-bold">
                  <Link
                    {...getResourcesRouteLink(
                      item.filter ? stringifyURLSearch(item.filter) : filters[idx].searchParams
                    )}
                    className="text-link-active"
                  >
                    <CollectionItemTitle item={filters[idx]}></CollectionItemTitle>
                  </Link>
                </h2>
              </div>
              <ResourcesTable
                resources={item.resources}
                filter={item.filter ?? filters[idx]}
              ></ResourcesTable>
              {!item.pagination.complete && (
                <ResourcesLoadMoreLink filter={item.filter ?? filters[idx]} />
              )}
            </section>
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
