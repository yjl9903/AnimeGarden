import { parse } from 'anipar';
import { stringifyURLSearch, type Resource, type ResolvedFilterOptions } from '@animegarden/client';
import { truncate } from '@animegarden/shared';
import type { FullSubject } from 'bgmd';

import { stringifySearchText } from '~/layouts/Search/utils';
import { generateTitleFromFilter } from '~/utils/server/meta';
import { getSubjectDisplayName } from '~/utils/subject';

import type { DescriptionResult } from '@animegarden/scraper';

const SiteTitle = 'Anime Garden 動漫花園資源網镜像站 动漫花园动画 BT 资源聚合站';
const SiteTitleSuffix = ` | ${SiteTitle}`;

export const HomeHead = {
  title: SiteTitle,
  description: 'Anime Garden 動漫花園資源網镜像站, 动漫花园动画 BT 资源聚合站'
};

export const AnimeHead = {
  title: `动画周历 | ${SiteTitle}`,
  description: `动画每周播出时间表, 动画周历, ${SiteTitle}`
};

export const CollectionDescription =
  'Anime Garden 资源收藏夹, 動漫花園資源網镜像站, 动漫花园动画 BT 资源聚合站';

export function resourcesHead(
  filter: ResolvedFilterOptions | undefined,
  subjects: Record<number, Pick<FullSubject, 'title'>>
) {
  const resolvedFilter = filter ?? {};
  const title = generateTitleFromFilter(resolvedFilter, subjects);
  const search = stringifyURLSearch(resolvedFilter);

  return {
    title: `${title} | ${SiteTitle}`,
    description: `最新资源 ${stringifySearchText(search, subjects)}`
  };
}

export function detailHead(
  resource: Resource<{ tracker: true; metadata: true }>,
  description: DescriptionResult,
  fallbackDescription: string
) {
  const info = parse(resource.title);
  const title = info?.title ?? resource.title;
  const descriptionText = description
    ? description.summary.startsWith(title)
      ? description.summary
      : `${title}: ${description.summary}`
    : `${title}: ${fallbackDescription}`;

  return {
    title: truncate(resource.title, 70),
    description: descriptionText
  };
}

export function subjectHead(subject: FullSubject | undefined, filter?: ResolvedFilterOptions) {
  const name = getSubjectDisplayName(subject);

  return {
    title:
      (name
        ? `${name} 最新资源`
        : generateTitleFromFilter(filter ?? {}, subject ? { [subject.id]: subject } : {})) +
      ` | ${SiteTitle}`,
    description:
      name && subject?.summary
        ? `${name}: ${truncate(subject.summary.replace(/\n/g, ' '), 120)}`
        : name
          ? `${name} | ${SiteTitle}`
          : `最新动画资源 | ${SiteTitle}`
  };
}

export function collectionHead(name: string | undefined) {
  return {
    title: `${name ? `${name} | ` : ''}${SiteTitle}`,
    description: CollectionDescription
  };
}

export function withoutSiteTitleSuffix(title: string) {
  return title.endsWith(SiteTitleSuffix) ? title.slice(0, -SiteTitleSuffix.length) : title;
}
