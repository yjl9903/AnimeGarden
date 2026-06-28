import { fetchResources, parseURLSearch, stringifyURLSearch } from '@animegarden/client';

import { getSubjectById } from '~/query/subject.server';
import { ResponseCacheControl } from '~/utils/response';
import { getFeedURL } from '~/utils/url';

import { resourcesHead, withoutSiteTitleSuffix } from './head.server';
import {
  formatFilter,
  formatResources,
  frontmatter,
  getFetchOptions,
  heading,
  paragraph,
  resolveResourcesFilter,
  siteOrigin,
  type MarkdownResult
} from './shared.server';

export async function renderResourcesMarkdown(url: URL, page: number): Promise<MarkdownResult> {
  const { filter: parsedFilter, pagination } = parseURLSearch(url.searchParams, { pageSize: 80 });
  const resolvedFilter = await resolveResourcesFilter({
    ...parsedFilter,
    ...pagination,
    page,
    pageSize: 30
  });
  const resp = await fetchResources({
    ...getFetchOptions(),
    ...resolvedFilter,
    tracker: true,
    metadata: true
  });

  if (!resp.ok) {
    throw new Error('获取资源列表失败');
  }

  const search = stringifyURLSearch(resp.filter ?? {}).toString();
  const feedURL = getFeedURL(search ? `?${search}` : undefined);
  const head = resourcesHead(resp.filter, await getSubjects(resp.filter?.subjects ?? []));

  const body =
    frontmatter(head) +
    heading(1, withoutSiteTitleSuffix(head.title)) +
    heading(2, '筛选条件') +
    paragraph(formatFilter(resp.filter)) +
    `当前页：${page}\n\n` +
    `RSS 订阅：${feedURL}\n\n` +
    heading(2, '资源列表') +
    formatResources(resp.resources) +
    paginationLinks(page, resp.pagination?.complete, url.search);

  return { body, cacheControl: ResponseCacheControl.List };
}

async function getSubjects(ids: number[]) {
  const subjects = await Promise.all(ids.map((id) => getSubjectById(id)));
  return Object.fromEntries(
    subjects.flatMap((subject) => (subject ? [[subject.id, subject]] : []))
  );
}

function paginationLinks(page: number, complete: boolean | undefined, search: string) {
  const lines = ['\n## 分页\n\n'];
  if (page > 1) lines.push(`- 上一页：${siteOrigin}/resources/${page - 1}${search}\n`);
  if (!complete) lines.push(`- 下一页：${siteOrigin}/resources/${page + 1}${search}\n`);
  return lines.join('');
}
