import { SupportProviders, fetchResourceDetail, type ProviderType } from '@animegarden/client';
import { normalizeDescription } from '@animegarden/scraper';

import { detailHead } from './head.server';
import { getSubjectById } from '~/query/subject.server';
import { formatChinaTime } from '~/utils/date';
import { ResponseCacheControl } from '~/utils/response';
import { parseSize } from '~/utils/string';
import { getSubjectDisplayName } from '~/utils/subject';

import {
  errorMarkdown,
  escapeMarkdown,
  frontmatter,
  getFetchOptions,
  heading,
  link,
  listItem,
  paragraph,
  resourceUrl,
  type MarkdownResult
} from './shared.server';

export async function renderDetailMarkdown(
  provider: string,
  providerId: string
): Promise<MarkdownResult> {
  if (!SupportProviders.includes(provider)) {
    return errorMarkdown('资源不存在', '不支持的资源来源。', 404);
  }

  const resp = await fetchResourceDetail(provider as ProviderType, providerId, getFetchOptions());
  if (!resp.ok || !resp.resource || !resp.detail) {
    return errorMarkdown('资源不存在', '请求的资源不存在。', 404);
  }

  const resource = resp.resource;
  const description = normalizeDescription(resp.detail.description);
  const subject = resource.subjectId ? await getSubjectById(resource.subjectId) : undefined;
  const head = detailHead(resource, description, resp.detail.description);

  const body =
    frontmatter({
      ...head,
      image: description.images[0]?.src ?? subject?.poster
    }) +
    heading(1, resource.title) +
    metadataList([
      ['类型', resource.type],
      ['来源', resource.provider],
      ['大小', parseSize(resource.size)],
      ['发布者', resource.publisher.name],
      ['字幕组', resource.fansub?.name],
      ['关联动画', subject ? getSubjectDisplayName(subject) : undefined],
      ['发布时间', formatChinaTime(new Date(resource.createdAt))],
      ['页面', resourceUrl(resource)],
      ['磁力链接', resource.magnet]
    ]) +
    heading(2, '简介') +
    paragraph(description.plain || resp.detail.description) +
    images(description.images) +
    magnets(resp.detail.magnets) +
    files(resp.detail.files, resp.detail.hasMoreFiles);

  return { body, cacheControl: ResponseCacheControl.Detail };
}

function metadataList(items: Array<[string, string | undefined | null]>) {
  return items
    .filter(([, value]) => value)
    .map(([key, value]) => listItem(`**${escapeMarkdown(key)}:** ${escapeMarkdown(value)}`))
    .join('')
    .concat('\n');
}

function images(items: Array<{ src: string; alt?: string }>) {
  if (!items.length) return '';
  return (
    heading(2, '图片') +
    items.map((item) => listItem(link(item.alt || item.src, item.src))).join('') +
    '\n'
  );
}

function magnets(items: Array<{ name: string; url: string }>) {
  if (!items.length) return '';
  return (
    heading(2, '磁力链接') +
    items.map((item) => listItem(link(item.name, item.url))).join('') +
    '\n'
  );
}

function files(items: Array<{ name: string; size: string }>, hasMoreFiles: boolean) {
  if (!items.length) return '';
  return (
    heading(2, '文件列表') +
    items
      .map((item) => listItem(`${escapeMarkdown(item.name)} · ${escapeMarkdown(item.size)}`))
      .join('') +
    (hasMoreFiles ? '\n更多文件请查看 HTML 页面。\n' : '\n')
  );
}
