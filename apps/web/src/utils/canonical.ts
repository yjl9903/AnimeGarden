import { APP_HOST } from '~build/env';

const CursorPaginationParams = ['anchor', 'cursor', 'limit'] as const;

/**
 * 生成规范 URL
 * @param pathname 路径名
 * @param search 查询参数
 * @returns 完整的规范 URL
 */
export function getCanonicalURL(pathname: string, search: string = ''): string {
  const baseURL = `https://${APP_HOST}`;
  const cleanPathname = '/' + pathname.replace(/^\//, '').replace(/\/$/, '');
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

  for (const name of CursorPaginationParams) {
    params.delete(name);
  }
  params.sort();

  const canonicalSearch = params.toString();
  return `${baseURL}${cleanPathname}${canonicalSearch ? `?${canonicalSearch}` : ''}`;
}
