import { useMemo } from 'react';
import { redirect, useLoaderData, useLocation } from '@remix-run/react';
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';

import { parseURLSearch } from '@animegarden/client';

import Layout from '~/layouts/Layout';
import Resources from '~/components/Resources';
import { generateFeed } from '~/utils/feed';
import { fetchResources } from '~/utils/fetch';

export const meta: MetaFunction = () => {
  return [
    { title: 'Anime Garden 動漫花園資源網第三方镜像站' },
    { name: 'description', content: '}Anime Garden 動漫花園資源網第三方镜像站' }
  ];
};

// export const loader = async ({ request, params }: LoaderFunctionArgs) => {
//   const url = new URL(request.url);

//   // Redirect to the first page
//   if (params.page === undefined) {
//     if (url.pathname.endsWith('/')) {
//       url.pathname += '1';
//     } else {
//       url.pathname += '/1';
//     }
//     return redirect(url.toString());
//   }

//   const parsed = parseURLSearch(url.searchParams, { pageSize: 80 });
//   const page = +(params.page ?? '1');
//   const { ok, resources, complete, filter, timestamp } = await fetchResources({
//     ...parsed,
//     page: +(params.page ?? '1')
//   });

//   return json({
//     ok,
//     resources,
//     complete,
//     page,
//     filter,
//     timestamp
//   });
// };

export default function ResourcesIndex() {
  const location = useLocation();
  // const { ok, resources, complete, filter, page, timestamp } = useLoaderData<typeof loader>();
  const feedURL = useMemo(
    () => `/feed.xml?filter=${generateFeed(new URLSearchParams(location.search))}`,
    [location]
  );

  return <Layout feedURL={feedURL}></Layout>;
}
