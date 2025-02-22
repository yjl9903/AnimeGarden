import { useMemo } from 'react';
import { redirect, useLoaderData, useLocation, useParams } from '@remix-run/react';
import { type LoaderFunctionArgs, type MetaFunction, json } from '@remix-run/cloudflare';

import { type Jsonify, type ResolvedFilterOptions, parseURLSearch } from '@animegarden/client';

import Layout from '~/layouts/Layout';
import Resources from '~/components/Resources';
import { fetchResources } from '~/utils/fetch';
import { getSubjectById } from '~/utils/subjects';
import { usePreferFansub } from '~/states';

import { Error } from '../resources.($page)/Error';
import { Filter } from '../resources.($page)/Filter';

export const meta: MetaFunction<typeof loader> = ({ data, params }) => {
  const subjectId = +params.subject!;
  const subject = getSubjectById(subjectId);
  const title = subject?.bangumi?.name_cn || subject?.name;

  return [
    { title: (title || '所有资源') + ' | Anime Garden 動漫花園資源網第三方镜像站' },
    { name: 'description', content: `Anime Garden 動漫花園資源網第三方镜像站` }
  ];
};

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

  const parsed = parseURLSearch(url.searchParams, { pageSize: 80 });
  const subject = +params.subject!;
  const page = +(params.page ?? '1');
  const { ok, resources, complete, filter, timestamp } = await fetchResources({
    ...parsed,
    subject,
    subjects: undefined,
    page: +(params.page ?? '1')
  });

  return json({
    ok,
    subject: getSubjectById(subject),
    resources,
    complete,
    page,
    filter,
    timestamp
  });
};

export default function ResourcesIndex() {
  const params = useParams();
  const location = useLocation();
  const { ok, subject, resources, complete, filter, page, timestamp } =
    useLoaderData<typeof loader>();
  const feedURL = useMemo(() => {
    const search = new URLSearchParams(location.search);
    search.set('subject', params.subject!);
    return `/feed.xml?${search.toString()}`;
  }, [location]);

  usePreferFansub(filter?.fansubs);

  return (
    <Layout feedURL={feedURL} timestamp={timestamp}>
      <div className="w-full pt-12 pb-24">
        {ok ? (
          <>
            <Filter filter={filter} subject={subject} feedURL={feedURL}></Filter>
            <Resources
              resources={resources}
              page={page}
              complete={complete}
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
