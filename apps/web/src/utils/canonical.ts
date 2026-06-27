import { APP_HOST } from '~build/env';

/**
 * 生成规范 URL
 * @param pathname 路径名
 * @param search 查询参数
 * @returns 完整的规范 URL
 */
export function getCanonicalURL(pathname: string, search: string = ''): string {
  const baseURL = `https://${APP_HOST}`;
  const cleanPathname = '/' + pathname.replace(/^\//, '').replace(/\/$/, '');
  const canonicalURL = `${baseURL}${cleanPathname}${search ? `?${search}` : ''}`;
  return canonicalURL;
}
