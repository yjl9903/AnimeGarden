import type {
  FetchOptions,
  FetchResourcesOptions,
  Resource,
  ResolvedFilterOptions
} from '@animegarden/client';

import { FEED_HOST, WEB_SERVER_URL, APP_HOST } from '~build/env';

import { formatChinaTime } from '~/utils/date';
import { ResponseCacheControl } from '~/utils/response';
import { parseSize } from '~/utils/string';
import { resolveSubjectsByName } from '~/query/subject.server';

import type { ResourcesQueryInput } from '~/query';

export const siteOrigin = `https://${APP_HOST}`;

export type MarkdownResult = {
  body: string;
  status?: number;
  cacheControl?: ResponseCacheControl;
};

export function getFetchOptions(timeout = 30_000): FetchOptions {
  return {
    baseURL: WEB_SERVER_URL || `https://${FEED_HOST}/`,
    retry: 0,
    timeout
  };
}

export async function resolveResourcesFilter(
  filter: ResourcesQueryInput
): Promise<FetchResourcesOptions> {
  const { subject, subjects, ...rest } = filter;
  const subjectIds: number[] = [];
  const names: string[] = [];

  for (const value of [subject, ...(subjects ?? [])]) {
    if (value === undefined) continue;
    if (typeof value === 'number') {
      subjectIds.push(value);
    } else {
      names.push(value);
    }
  }

  const resolvedSubjects = names.length ? await resolveSubjectsByName(names) : [];
  const resolvedIds = [
    ...new Set([...subjectIds, ...resolvedSubjects.map((resolved) => resolved.id)])
  ];

  return {
    ...rest,
    subjects: resolvedIds.length ? resolvedIds : undefined
  } as FetchResourcesOptions;
}

export function markdownResponse(result: MarkdownResult, request: Request) {
  const headers = new Headers({
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': result.cacheControl ?? ResponseCacheControl.List,
    Vary: 'Accept',
    'x-markdown-tokens': String(estimateTokens(result.body))
  });

  return new Response(request.method === 'HEAD' ? null : result.body, {
    status: result.status ?? 200,
    headers
  });
}

export function errorMarkdown(title: string, message: string, status = 502): MarkdownResult {
  return {
    status,
    cacheControl: ResponseCacheControl.Error,
    body:
      frontmatter({ title, description: message }) + `# ${escapeMarkdown(title)}\n\n${message}\n`
  };
}

export function frontmatter(values: { title: string; description?: string; image?: string }) {
  const lines = [`title: ${yamlString(values.title)}`];
  if (values.description) lines.push(`description: ${yamlString(values.description)}`);
  if (values.image) lines.push(`image: ${yamlString(values.image)}`);
  return `---\n${lines.join('\n')}\n---\n\n`;
}

export function heading(level: number, text: string) {
  return `${'#'.repeat(level)} ${escapeMarkdown(text)}\n\n`;
}

export function paragraph(text?: string | null) {
  const value = text?.trim();
  return value ? `${escapeMarkdown(value)}\n\n` : '';
}

export function listItem(text: string) {
  return `- ${text}\n`;
}

export function link(label: string, href: string) {
  return `[${escapeMarkdown(label)}](${href.replace(/\)/g, '%29')})`;
}

export function resourceUrl(resource: Pick<Resource, 'provider' | 'providerId'>) {
  return `${siteOrigin}/detail/${resource.provider}/${resource.providerId}`;
}

export function formatResource(resource: Resource<{ tracker: true; metadata: true }>) {
  const parts = [
    link(resource.title, resourceUrl(resource)),
    escapeMarkdown(resource.type),
    parseSize(resource.size),
    resource.fansub?.name ? `字幕组: ${escapeMarkdown(resource.fansub.name)}` : undefined,
    `发布者: ${escapeMarkdown(resource.publisher.name)}`,
    formatChinaTime(new Date(resource.createdAt))
  ].filter(Boolean);

  return listItem(parts.join(' · '));
}

export function formatResources(resources: Resource<{ tracker: true; metadata: true }>[]) {
  if (!resources.length) return '暂无资源。\n\n';
  return resources.map(formatResource).join('') + '\n';
}

export function formatFilter(filter?: ResolvedFilterOptions) {
  if (!filter) return '全部资源';

  const parts = [
    filter.preset ? `预设=${filter.preset}` : undefined,
    filter.provider ? `来源=${filter.provider}` : undefined,
    filter.types?.length ? `类型=${filter.types.join(', ')}` : undefined,
    filter.subjects?.length ? `动画=${filter.subjects.join(', ')}` : undefined,
    filter.fansubs?.length ? `字幕组=${filter.fansubs.join(', ')}` : undefined,
    filter.publishers?.length ? `发布者=${filter.publishers.join(', ')}` : undefined,
    filter.search?.length ? `搜索=${filter.search.join(', ')}` : undefined,
    filter.include?.length ? `标题=${filter.include.join(', ')}` : undefined,
    filter.keywords?.length ? `包含=${filter.keywords.join(', ')}` : undefined,
    filter.exclude?.length ? `排除=${filter.exclude.join(', ')}` : undefined
  ].filter(Boolean);

  return parts.length ? parts.join('；') : '全部资源';
}

export function escapeMarkdown(value: unknown) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/([`*_{}\[\]()#+\-.!|>])/g, '\\$1');
}

export function estimateTokens(markdown: string) {
  return Math.max(1, Math.ceil(markdown.length / 4));
}

function yamlString(value: string) {
  return JSON.stringify(value.replace(/\s+/g, ' ').trim());
}
