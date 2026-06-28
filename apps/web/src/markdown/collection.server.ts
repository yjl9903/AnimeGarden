import { fetchCollection } from '@animegarden/client';

import { ResponseCacheControl } from '~/utils/response';

import { collectionHead } from './head.server';
import {
  errorMarkdown,
  formatFilter,
  formatResources,
  frontmatter,
  getFetchOptions,
  heading,
  paragraph,
  type MarkdownResult
} from './shared.server';

export async function renderCollectionMarkdown(hash: string): Promise<MarkdownResult> {
  const resp = await fetchCollection(hash, getFetchOptions());
  if (!resp?.ok) {
    return errorMarkdown('收藏夹不存在', '请求的收藏夹不存在。', 404);
  }

  const head = collectionHead(resp.name);
  const body =
    frontmatter(head) +
    heading(1, resp.name || '收藏夹') +
    paragraph(`收藏夹哈希：${resp.hash}`) +
    resp.results
      .map((result, index) => {
        const filter = resp.filters[index];
        return (
          heading(2, filter?.name || `筛选条件 ${index + 1}`) +
          paragraph(formatFilter(result.filter)) +
          formatResources(result.resources) +
          (result.complete ? '' : '这个筛选条件还有更多资源，请查看 HTML 页面。\n\n')
        );
      })
      .join('');

  return { body, cacheControl: ResponseCacheControl.List };
}
