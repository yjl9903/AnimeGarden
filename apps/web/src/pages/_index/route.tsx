import { useEffect } from 'react';

import type { Resource } from '@animegarden/client';

import Layout from '~/layouts/Layout';
import Resources from '~/components/Resources';
import { getTrackingError, trackFetchResourcesError } from '~/utils';
import { getResourcesRouteLink } from '~/utils/routes';

import { Error } from '../resources.($page)/Error';

export interface IndexProps {
  data: {
    ok: boolean;
    resources: Resource<{ tracker: true }>[];
    timestamp?: Date;
    error: any;
  };
  feedURL: string;
  path: string;
  renderError: string;
}

export default function Index({ data, feedURL, path, renderError }: IndexProps) {
  const { ok, resources, timestamp, error } = data;

  useEffect(() => {
    if (!error || !ok) return;

    trackFetchResourcesError({
      path,
      error: getTrackingError(error, 'index-fetch-failed')
    });
  }, [error, ok, path]);

  return (
    <Layout feedURL={feedURL} timestamp={timestamp}>
      <div className="w-full pt-13 pb-24">
        {ok ? (
          <Resources
            resources={resources}
            page={1}
            timestamp={new Date(timestamp!)}
            complete={false}
            link={(page) => getResourcesRouteLink(page, 'type=动画&type=合集&preset=bangumi')}
          ></Resources>
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
