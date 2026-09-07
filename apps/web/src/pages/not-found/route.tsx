import { isNotFound, Link, notFound } from '@tanstack/react-router';

import Layout from '~/layouts/Layout';
import { ResponseCacheControl } from '~/utils/response';

import { ErrorMessage } from '../resources.($page)/Error';

export type NotFoundPageData = {
  kind?: 'page' | 'resource' | 'collection' | 'subject' | 'calendar';
};

const NotFoundMessage: Record<NonNullable<NotFoundPageData['kind']>, string> = {
  page: '请求的页面不存在',
  resource: '请求的资源不存在',
  collection: '请求的收藏夹不存在',
  subject: '请求的动画不存在',
  calendar: '请求的动画周历不存在或尚未发布'
};

/** Throws a Router not-found error with the shared page data and non-cacheable response headers. */
export function throwNotFoundPage(kind: NonNullable<NotFoundPageData['kind']>): never {
  throw notFound({
    data: { kind },
    headers: { 'Cache-Control': ResponseCacheControl.Error }
  });
}

/** Applies non-cacheable response headers only while a route is rendering its not-found state. */
export function buildNotFoundPageHeaders(error: unknown): Record<string, string> {
  return isNotFound(error) ? { 'Cache-Control': ResponseCacheControl.Error } : {};
}

/** Renders the shared HTML not-found page for missing routes and resources. */
export default function NotFoundPage({ data }: { data?: unknown }) {
  const kind = isNotFoundPageData(data) ? (data.kind ?? 'page') : 'page';

  return (
    <Layout heading={false}>
      <div className="w-full py-24 flex flex-col items-center gap-4">
        <h1 className="sr-only">页面不存在</h1>
        <ErrorMessage message={NotFoundMessage[kind]} />
        <Link to="/" className="text-link">
          返回首页
        </Link>
      </div>
    </Layout>
  );
}

function isNotFoundPageData(value: unknown): value is NotFoundPageData {
  if (!value || typeof value !== 'object') return false;
  const kind = (value as NotFoundPageData).kind;
  return (
    kind === undefined ||
    kind === 'page' ||
    kind === 'resource' ||
    kind === 'collection' ||
    kind === 'subject' ||
    kind === 'calendar'
  );
}
