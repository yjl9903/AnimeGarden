import { dim, link } from 'breadc';

import type { Subject } from '../subject/subject.ts';
import type {
  ExtractedSubjectResource,
  ParsedSubjectResource
} from '../subject/source/resource.ts';
import type { GetSubjectsOptions, System } from '../system/system.ts';

import { formatDateTime } from '../utils/date.ts';

import { printList } from './tui.ts';

export async function getSubjects(system: System, options: GetSubjectsOptions) {
  await system.loadSubjects();

  const subjects = system.getSubjects();

  return subjects;
}

export async function getSubject(system: System, options: GetSubjectsOptions) {
  await system.loadSubjects();

  const subject = system.getSubject(options);
  if (!subject) {
    system.logger.error(`未找到相关动画条目`, options);
    throw new Error(`未找到相关动画条目`);
  }

  return subject;
}

export interface PrintResourcesOptions {
  json?: boolean;
}

export async function printParsedResources(
  system: System,
  subject: Subject,
  resources: ParsedSubjectResource[],
  options: PrintResourcesOptions
) {
  printList(
    system,
    resources,
    (res) => {
      const fansub = res.parsed.fansub ? dim('字幕组:' + res.parsed.fansub) : '';
      const season = res.parsed.season ? dim(`第 ${res.parsed.season ?? 1} 季`) : '';
      const episode = dim(`第 ${res.parsed.episode ?? '-'} 集`);
      const createdAt = res.createdAt ? dim(formatDateTime(res.createdAt)) : '';

      return [
        `${link(res.name, res.url)}`,
        [fansub, season, episode, createdAt].filter(Boolean).join('  ')
      ];
    },
    (res) => `${res.name}  ${res.url}`,
    {
      json: options.json,
      footer() {
        // return [dim(`总计抓取到 ${resources.length} 条资源`)];
      }
    }
  );
}

export async function printExtractedResources(
  system: System,
  subject: Subject,
  resources: ExtractedSubjectResource[],
  options: PrintResourcesOptions
) {
  printList(
    system,
    resources,
    (res) => {
      const fansub = res.extracted.fansub ? dim('字幕组:' + res.extracted.fansub) : '';
      const season =
        res.extracted.season && res.parsed.season ? dim(`第 ${res.extracted.season} 季`) : '';
      const episode = dim(`第 ${res.extracted.episode ?? '-'} 集`);
      const createdAt = res.createdAt ? dim(formatDateTime(res.createdAt)) : '';

      return [
        res.extracted.filename,
        dim(`来源: ${link(res.name, res.url)}`),
        [fansub, season, episode, createdAt].filter(Boolean).join('  ')
      ];
    },
    (res) => `${res.extracted.filename}`,
    {
      json: options.json,
      footer() {}
    }
  );
}

export async function printSource(system: System, subject: Subject) {
  if (subject.source.animegarden) {
    const { animegarden } = subject.source;
    if (animegarden.filter.after) {
      system.logger.log(`${dim('开始于')}    ${formatDateTime(animegarden.filter.after)}`);
    }
    if (animegarden.filter.before) {
      system.logger.log(`${dim('结束于')}    ${formatDateTime(animegarden.filter.before)}`);
    }
    if (animegarden.filter.search && animegarden.filter.search.length > 0) {
      if (animegarden.filter.search.length === 1) {
        system.logger.log(`${dim('标题搜索')}  ${animegarden.filter.search[0]}`);
      } else if (animegarden.filter.search.length > 1) {
        system.logger.log(`${dim('标题搜索')}  ${dim('|')} ${animegarden.filter.search[0]}`);
        for (const search of animegarden.filter.search.slice(1)) {
          system.logger.log(`          ${dim('|')} ${search}`);
        }
      }
    }
    if (animegarden.filter.include && animegarden.filter.include.length > 0) {
      if (animegarden.filter.include.length === 1) {
        system.logger.log(`${dim('标题包含')}  ${animegarden.filter.include[0]}`);
      } else if (animegarden.filter.include.length > 1) {
        system.logger.log(`${dim('标题包含')}  ${dim('|')} ${animegarden.filter.include[0]}`);
        for (const include of animegarden.filter.include.slice(1)) {
          system.logger.log(`          ${dim('|')} ${include}`);
        }
      }
    }
    if (animegarden.filter.keywords && animegarden.filter.keywords.length > 0) {
      system.logger.log(`${dim('关键词')}    ${animegarden.filter.keywords.join(' & ')}`);
    }
    if (animegarden.filter.exclude && animegarden.filter.exclude.length > 0) {
      system.logger.log(`${dim('排除')}      ${animegarden.filter.exclude.join(' & ')}`);
    }
    if (animegarden.filter.fansubs) {
      system.logger.log(`${dim('字幕组')}    ${animegarden.filter.fansubs.join(` ${dim('>')} `)}`);
    } else {
      system.logger.log(`${dim('字幕组')}    未配置`);
    }
  }
}
