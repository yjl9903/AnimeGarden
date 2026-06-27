import clsx from 'clsx';
import styleToObject from 'style-to-object';
import { useEffect, useMemo } from 'react';

import Resources from '~/components/Resources';
import { getTrackingError, trackFetchResourcesError } from '~/utils';
import { toRouterSearch } from '~/utils/routes';

import { Error } from '../resources.($page)/Error';

export default function ResourcesIndex({
  data,
  searchStr,
  path,
  renderError
}: {
  data: {
    ok: boolean;
    resources: any[];
    pagination?: { page?: number; complete?: boolean };
    timestamp?: Date;
    error: any;
  };
  searchStr: string;
  path: string;
  renderError: string;
}) {
  const searchParams = useMemo(() => new URLSearchParams(searchStr), [searchStr]);
  const inlineClassName = searchParams.getAll('className');
  const inlineStyle = styleToObject(searchParams.getAll('style').join(';')) ?? {};

  const { ok, resources, pagination, timestamp, error } = data;

  useEffect(() => {
    if (!error || !ok) return;

    trackFetchResourcesError({
      path,
      error: getTrackingError(error, 'iframe-fetch-failed')
    });
  }, [error, ok, path]);

  return (
    <div className={clsx('w-full', inlineClassName)} style={inlineStyle}>
      {ok ? (
        <>
          <Resources
            resources={resources}
            page={pagination?.page ?? 1}
            complete={pagination?.complete ?? false}
            timestamp={new Date(timestamp!)}
            link={(page) => {
              const newSearchParams = new URLSearchParams(searchStr);
              newSearchParams.set('page', page.toString());
              return {
                to: '/iframe',
                search: toRouterSearch(newSearchParams)
              };
            }}
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
  );
}
