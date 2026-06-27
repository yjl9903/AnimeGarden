import { useEffect } from 'react';

import Layout from '~/layouts/Layout';
import Resources from '~/components/Resources';
import type { PaginationLink } from '~/components/Resources/pagination';
import { usePreferFansub } from '~/stores/fansubs';
import { getTrackingError, trackFetchResourcesError } from '~/utils';

import { Error } from './Error';
import { FilterCard, type ResourceFilter } from './Filter';

export interface ResourcesIndexProps {
  data: {
    ok: boolean;
    resources: any[];
    pagination?: { complete?: boolean };
    filter?: ResourceFilter;
    page: number;
    timestamp?: Date;
    error: any;
  };
  feedURL: string;
  path: string;
  link: (page: number) => PaginationLink;
  renderError: string;
}

export default function ResourcesIndex({
  data,
  feedURL,
  path,
  link,
  renderError
}: ResourcesIndexProps) {
  const { ok, resources, pagination, filter, page, timestamp, error } = data;

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
              page={page}
              complete={pagination?.complete ?? false}
              timestamp={new Date(timestamp!)}
              link={link}
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
