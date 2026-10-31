import { useEffect } from 'react';

import Layout from '~/layouts/Layout';
import Resources from '~/components/Resources';
import { usePreferFansub } from '~/stores/fansubs';
import { getTrackingError, trackFetchResourcesError } from '~/utils';

import { Error } from './Error';
import { FilterCard, type ResourceFilter } from './Filter';

export interface ResourcesIndexProps {
  data: {
    ok: boolean;
    resources: any[];
    pagination?: { anchor?: number; complete?: boolean };
    filter?: ResourceFilter;
    timestamp?: Date;
    error: any;
  };
  feedURL: string;
  path: string;
  isLoadingMore?: boolean;
  onLoadMore?: () => unknown | Promise<unknown>;
  renderError: string;
}

export default function ResourcesIndex({
  data,
  feedURL,
  path,
  isLoadingMore,
  onLoadMore,
  renderError
}: ResourcesIndexProps) {
  const { ok, resources, pagination, filter, timestamp, error } = data;

  usePreferFansub(filter?.fansubs ?? undefined);

  useEffect(() => {
    if (!error || !ok) return;

    trackFetchResourcesError({
      path,
      error: getTrackingError(error, 'resources-fetch-failed')
    });
  }, [error, ok, path]);

  return (
    <Layout feedURL={feedURL} timestamp={timestamp}>
      <div className="w-full pt-13 pb-24">
        {ok ? (
          <>
            <FilterCard
              filter={filter}
              feedURL={feedURL}
              resources={resources}
              complete={pagination?.complete ?? false}
            ></FilterCard>
            <Resources
              resources={resources}
              filter={filter}
              complete={pagination?.complete ?? false}
              isLoadingMore={isLoadingMore}
              hasLoadMoreError={Boolean(error)}
              onLoadMore={onLoadMore}
            ></Resources>
          </>
        ) : (
          <Error
            tracking={{
              error: renderError
            }}
          ></Error>
        )}
      </div>
    </Layout>
  );
}
