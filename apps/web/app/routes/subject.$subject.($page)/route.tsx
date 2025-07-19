import { useMemo } from 'react';
import {
  type ClientLoaderFunction,
  redirect,
  useLoaderData,
  useLocation,
  useParams
} from '@remix-run/react';
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';

import { parseURLSearch } from '@animegarden/client';

import Layout from '~/layouts/Layout';
import Resources from '~/components/Resources';
import { stringifySearch } from '~/layouts/Search/utils';
import { usePreferFansub } from '~/states';
import { fetchResources, getFeedURL } from '~/utils';
import { generateTitleFromFilter } from '~/utils/server/meta';
import { getSubjectById, getSubjectDisplayName, waitForSubjectsLoaded } from '~/utils/subjects';

import { Error } from '../resources.($page)/Error';
import { FilterCard } from '../resources.($page)/Filter';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  // Redirect to the first page
  if (params.page === undefined) {
    if (url.pathname.endsWith('/')) {
      url.pathname += '1';
    } else {
      url.pathname += '/1';
    }
    return redirect(url.toString());
  }

  const page = Math.floor(+(params.page ?? '1'));
  if (page <= 0) {
    url.pathname = url.pathname.replace(/\/-?\d+(\.\d*)?$/, '/1');
    return redirect(url.toString());
  }

  const { filter: parsedFilter, pagination: parsedPagination } = parseURLSearch(url.searchParams, {
    pageSize: 80
  });
  const subject = +params.subject!;

  const { ok, resources, pagination, filter, timestamp } = await fetchResources({
    ...parsedFilter,
    ...parsedPagination,
    subject,
    subjects: undefined,
    page: +(params.page ?? '1'),
    pageSize: 100,
    types: ['动画', '合集']
  });

  return {
    ok,
    subject: getSubjectById(subject),
    resources,
    pagination,
    page,
    filter,
    timestamp
  };
};

export const meta: MetaFunction<typeof loader> = ({ location, data, params }) => {
  const subject = data?.subject;
  const name = getSubjectDisplayName(subject);

  return [
    {
      title:
        (name ? name + ' 最新资源' : generateTitleFromFilter(data?.filter ?? {})) +
        ' | Anime Garden 動漫花園資源網第三方镜像站'
    },
    {
      name: 'description',
      content: `最新资源 ${stringifySearch(new URLSearchParams(location.search))}`
    }
  ];
};

export const clientLoader: ClientLoaderFunction = async ({ serverLoader }) => {
  const serverData = await serverLoader<typeof loader>();
  if (serverData?.filter?.subjects) {
    await waitForSubjectsLoaded();
  }
  return serverData;
};
clientLoader.hydrate = true;

export function HydrateFallback() {
  return <div></div>;
}

export default function ResourcesIndex() {
  const params = useParams();
  const location = useLocation();
  const { ok, subject, resources, pagination, filter, page, timestamp } =
    useLoaderData<typeof loader>();
  const feedURL = useMemo(() => {
    const search = new URLSearchParams(location.search);
    search.set('subject', params.subject!);
    return getFeedURL(`?${search.toString()}`);
  }, [location]);

  usePreferFansub(filter?.fansubs);

  return (
    <Layout feedURL={feedURL} timestamp={timestamp}>
      <div className="w-full pt-12 pb-24">
        {ok ? (
          <>
            <FilterCard
              filter={filter}
              subject={subject}
              feedURL={feedURL}
              resources={resources}
              complete={pagination?.complete ?? false}
            ></FilterCard>
            <Resources
              resources={resources}
              page={page}
              complete={pagination?.complete ?? false}
              timestamp={new Date(timestamp!)}
              pathname={`/subject/${params.subject}`}
              link={(page) => `/subject/${params.subject}/${page}${location.search}`}
            ></Resources>
          </>
        ) : (
          <Error></Error>
        )}
      </div>
    </Layout>
  );
}
