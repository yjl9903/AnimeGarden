/**
 * Markdown rendering for the `animegarden_search_resources` tool.
 *
 * `renderMarkdown` is the tool's `output.render`: it turns the structured
 * result into the single model-facing text block, with one table row per
 * resource and actionable hints when the search returns nothing.
 */

import type { ContentBlock } from '../shared/types';

import { DEFAULT_LIMIT } from '../../shared/limit';
import { isRecord, toArray, toTimestamp } from '../shared/utils';

import type { SearchResult } from './types';

/** Escape a value for one Markdown table cell. */
export function escapeCell(value: unknown): string {
  const text = String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .trim();
  return text.length > 0 ? text : '未知';
}

/**
 * Render the pagination metadata returned by the public API.
 *
 * @param pagination - page/pageSize/complete from the tool result.
 * @returns inline code fragments such as ``page=1，pageSize=30，complete=false``.
 */
function formatPagination(pagination: SearchResult['pagination']): string {
  return `\`page=${pagination.page}\`，\`pageSize=${pagination.pageSize}\`，\`complete=${pagination.complete}\``;
}

/**
 * Render the resolved filter groups the server actually applied.
 *
 * @param filter - structured filter groups from the tool result.
 * @returns inline code fragments such as ``types=["动画"]，search=["芙莉莲"]``.
 */
function formatResolvedFilter(filter: SearchResult['filter']): string {
  const parts = Object.entries(filter)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `\`${key}=${JSON.stringify(value)}\``);
  return parts.length === 0 ? '无' : parts.join('，');
}

/**
 * Render the successful result as one Markdown text block: a header line and
 * the resource table, plus a `limit` hint when the requested count was filled.
 *
 * @param args - raw tool arguments (used for hints only).
 * @param value - structured result validated against `OUTPUT_SCHEMA`.
 * @returns model-facing content blocks.
 */
export function renderMarkdown(args: unknown, value: SearchResult): ContentBlock[] {
  const input = isRecord(args) ? args : {};
  const resources = value.resources;
  const search = (value.filter.search ?? []).join(' ').trim();
  const limit = value.pagination.pageSize > 0 ? value.pagination.pageSize : DEFAULT_LIMIT;
  const lines = ['### AnimeGarden 资源搜索', ''];

  if (resources.length === 0) {
    lines.push(
      search.length > 0
        ? `未找到匹配「${search}」的资源（最多 ${limit} 条）。可尝试放宽筛选：`
        : `未找到匹配资源（最多 ${limit} 条）。可尝试放宽筛选：`
    );
    lines.push('');
    lines.push(`分页参数：${formatPagination(value.pagination)}`);
    lines.push(`筛选参数：${formatResolvedFilter(value.filter)}`);
    lines.push(`响应时间：\`${value.timestamp}\``);
    lines.push('');
    lines.push(...emptyResultHints(input).map((hint) => `- ${hint}`));
    return [{ type: 'text', text: lines.join('\n').trim() }];
  }

  lines.push(`分页参数：${formatPagination(value.pagination)}`);
  lines.push(`筛选参数：${formatResolvedFilter(value.filter)}`);
  lines.push(`响应时间：\`${value.timestamp}\``);
  lines.push('');
  lines.push(
    '| 标题 | 来源 | 类型 | 字幕组/发布者 | 大小 | 发布时间 | 源站 | 详情 | 播放（KeepShare） | 下载（magnet） |'
  );
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  const link = (url: string, label: string): string =>
    url.length > 0 ? `[${label}](${url})` : '—';
  for (const resource of resources) {
    const size = `${resource.sizeText}（${resource.size} B）`;
    // Keep provider and providerId together so resources stay identifiable.
    const source = `${resource.provider}:${resource.providerId}`;
    const credits = `${resource.fansub === '' ? '未知' : resource.fansub} / ${resource.publisher === '' ? '未知' : resource.publisher}`;
    lines.push(
      `| ${escapeCell(resource.title)} | ${escapeCell(source)} | ${escapeCell(resource.type)} | ${escapeCell(credits)} | ${escapeCell(size)} | ${escapeCell(resource.createdAt)} | ${link(resource.href, '源站')} | ${link(resource.detailUrl, '详情')} | ${link(resource.keepshareUrl, '播放')} | ${link(resource.magnet, '下载')} |`
    );
  }
  lines.push('');
  if (resources.length >= limit) {
    lines.push(
      `已达到 \`limit\` 上限（${limit} 条）：可提高 \`limit\`（最大 100），或用 \`after\` / \`before\` 调整时间窗口分段查询。`
    );
  }
  return [{ type: 'text', text: lines.join('\n').trim() }];
}

/**
 * Actionable suggestions when a search returns nothing, derived from the
 * filters the call actually used.
 *
 * @param args - raw tool arguments.
 * @returns Markdown-bullet hint texts.
 */
export function emptyResultHints(args: Record<string, unknown>): string[] {
  const hints: string[] = [];
  const narrowed = [
    'include',
    'keywords',
    'exclude',
    'fansubs',
    'publishers',
    'types',
    'subjects',
    'preset',
    'provider'
  ]
    .filter((name) => toArray(args[name]).length > 0)
    .map((name) => `\`${name}\``);
  if (narrowed.length > 0) hints.push(`移除或减少 ${narrowed.join('、')} 筛选。`);
  if (
    toTimestamp(args.after, 'after') !== undefined ||
    toTimestamp(args.before, 'before') !== undefined
  ) {
    hints.push('扩大 `after` / `before` 的时间范围。');
  }
  if (toArray(args.search).length > 0) {
    hints.push('把 `search` 换得更短或更通用，或改用 `include` 做标题匹配。');
  } else {
    hints.push('确认标题关键词拼写，或省略筛选条件浏览最新资源。');
  }
  return hints;
}
