import { fetchResources } from '@animegarden/client';

import { ResponseCacheControl } from '~/utils/response';
import { getFeedURL } from '~/utils/url';

import { HomeHead } from './head.server';
import {
  formatResources,
  frontmatter,
  getFetchOptions,
  heading,
  paragraph,
  type MarkdownResult
} from './shared.server';

export async function renderHomeMarkdown(): Promise<MarkdownResult> {
  const resp = await fetchResources({
    ...getFetchOptions(),
    page: 1,
    pageSize: 30,
    types: ['动画', '合集'],
    preset: 'bangumi',
    tracker: true,
    metadata: true
  });

  if (!resp.ok) {
    throw new Error('获取最新资源失败');
  }

  const body =
    frontmatter(HomeHead) +
    heading(1, 'Anime Garden') +
    paragraph('動漫花園資源網镜像站, 动漫花园动画 BT 资源聚合站。') +
    `RSS 订阅：${getFeedURL()}\n\n` +
    heading(2, '最新资源') +
    formatResources(resp.resources);

  return { body, cacheControl: ResponseCacheControl.List };
}
