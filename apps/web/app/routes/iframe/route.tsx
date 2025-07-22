import clsx from 'clsx';
import styleToObject from 'style-to-object';
import { useMemo } from 'react';
import { useLoaderData, useLocation } from '@remix-run/react';
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';

import { parseURLSearch, stringifyURLSearch } from '@animegarden/client';

import Resources from '~/components/Resources';
import { stringifySearch } from '~/layouts/Search/utils';
import { generateTitleFromFilter } from '~/utils/server/meta';
import { fetchResources, getCanonicalURL } from '~/utils';

import { Error } from '../resources.($page)/Error';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  const { filter: parsedFilter, pagination: parsedPagination } = parseURLSearch(url.searchParams);
  const { ok, resources, pagination, filter, timestamp } = await fetchResources({
    ...parsedFilter,
    ...parsedPagination,
    pageSize: 30
  });

  return {
    ok,
    resources,
    pagination,
    filter,
    timestamp
  };
};

export const meta: MetaFunction<typeof loader> = ({ location, data }) => {
  const title = generateTitleFromFilter(data?.filter ?? {});
  const search = stringifyURLSearch(data?.filter ?? {});

  return [
    { title: title + ' | Anime Garden 動漫花園資源網第三方镜像站' },
    {
      name: 'description',
      content: `最新资源 ${stringifySearch(new URLSearchParams(location.search))}`
    },
    {
      tagName: 'link',
      rel: 'canonical',
      href: getCanonicalURL(`/iframe`, search.toString())
    }
  ];
};

export default function ResourcesIndex() {
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const inlineClassName = searchParams.getAll('className');
  const inlineStyle = styleToObject(searchParams.getAll('style').join(';')) ?? {};

  const { ok, resources, pagination, filter, timestamp } = useLoaderData<typeof loader>();

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
              const newSearchParams = new URLSearchParams(location.search);
              newSearchParams.set('page', page.toString());
              return `/iframe?${newSearchParams.toString()}`;
            }}
          ></Resources>
        </>
      ) : (
        <Error></Error>
      )}
    </div>
  );
}
