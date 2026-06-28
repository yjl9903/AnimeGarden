import { fetchResources } from '@animegarden/client';

import { groupResourcesByFansub } from '~/pages/subject.$subject.($page)/utils';
import { getSubjectById } from '~/query/subject.server';
import { ResponseCacheControl } from '~/utils/response';
import { getSubjectDisplayName } from '~/utils/subject';

import { subjectHead } from './head.server';
import {
  errorMarkdown,
  formatResources,
  frontmatter,
  getFetchOptions,
  heading,
  paragraph,
  type MarkdownResult
} from './shared.server';

export async function renderSubjectMarkdown(subjectId: number): Promise<MarkdownResult> {
  const subject = await getSubjectById(subjectId);
  if (!subject) {
    return errorMarkdown('动画不存在', '请求的动画不存在。', 404);
  }

  const resp = await fetchResources({
    ...getFetchOptions(),
    subject: subjectId,
    page: 1,
    pageSize: 1000,
    types: ['动画', '合集'],
    tracker: true,
    metadata: true
  });

  if (!resp.ok) {
    throw new Error('获取动画资源失败');
  }

  const title = getSubjectDisplayName(subject);
  const head = subjectHead(subject, resp.filter);
  const body =
    frontmatter({
      ...head,
      image: subject.poster
    }) +
    heading(1, title) +
    paragraph(subject.summary) +
    renderGroups(groupResourcesByFansub(resp.resources));

  return { body, cacheControl: ResponseCacheControl.List };
}

function renderGroups(groups: ReturnType<typeof groupResourcesByFansub>) {
  if (!groups.length) return '暂无资源。\n\n';

  return groups
    .map(
      (group) =>
        heading(2, formatFansubResourceHeading(group.fansub?.name)) +
        formatResources(group.resources)
    )
    .join('\n');
}

function formatFansubResourceHeading(name?: string | null) {
  const baseName = name?.trim() || '未知';
  const fansubName = /字幕[组組]$/.test(baseName) ? baseName : `${baseName}字幕组`;
  return `${fansubName} 最新资源`;
}
