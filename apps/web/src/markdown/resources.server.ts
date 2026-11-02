import { fetchResources, parseURLSearch, stringifyURLSearch } from '@animegarden/client';

import { getSubjectById } from '~/query/subject.server';
import { ResponseCacheControl } from '~/utils/response';
import { getFeedURL } from '~/utils';
import { buildResourcesPageSeo } from '~/pages/resources.($page)/seo';
import { withoutSiteTitleSuffix } from '~/utils/seo';
import {
  formatFilter,
  formatResources,
  frontmatter,
  getFetchOptions,
  heading,
  paragraph,
  resolveResourcesFilter,
  type MarkdownResult
} from './shared.server';

export async function renderResourcesMarkdown(url: URL): Promise<MarkdownResult> {
  const { filter: parsedFilter } = parseURLSearch(url.searchParams);
  const resolvedFilter = await resolveResourcesFilter({
    ...parsedFilter,
    limit: 30
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
  const head = buildResourcesPageSeo(resp.filter, await getSubjects(resp.filter?.subjects ?? []));

  const body =
    frontmatter(head) +
    heading(1, withoutSiteTitleSuffix(head.title)) +
    heading(2, '筛选条件') +
    paragraph(formatFilter(resp.filter)) +
    `RSS 订阅：${feedURL}\n\n` +
    heading(2, '资源列表') +
    formatResources(resp.resources) +
    (resp.pagination.complete ? '' : '还有更多资源，请查看 HTML 页面继续加载。\n\n');

  return { body, cacheControl: ResponseCacheControl.List };
}

async function getSubjects(ids: number[]) {
  const subjects = await Promise.all(ids.map((id) => getSubjectById(id)));
  return Object.fromEntries(
    subjects.flatMap((subject) => (subject ? [[subject.id, subject]] : []))
  );
}
