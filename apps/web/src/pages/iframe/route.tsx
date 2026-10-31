import clsx from 'clsx';
import styleToObject from 'style-to-object';
import { useEffect, useMemo } from 'react';

import type { ResolvedFilterOptions } from '@animegarden/client';

import Resources from '~/components/Resources';
import { getTrackingError, trackFetchResourcesError } from '~/utils';

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
    pagination?: { complete?: boolean };
    filter?: ResolvedFilterOptions;
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

  const { ok, resources, pagination, filter, error } = data;

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
            filter={filter}
            complete={pagination?.complete ?? false}
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
