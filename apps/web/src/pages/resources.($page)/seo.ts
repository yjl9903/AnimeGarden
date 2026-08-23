import { stringifyURLSearch, type Jsonify, type ResolvedFilterOptions } from '@animegarden/client';
import { truncate } from '@animegarden/shared';

import { getCanonicalURL } from '~/utils/canonical';
import { PRESET_DISPLAY_NAME } from '~/utils/constants';
import { formatChinaTime } from '~/utils/date';
import {
  buildOpenGraphMeta,
  buildPageTitle,
  buildTwitterCardMeta,
  NoIndexMeta,
  normalizeSeoText,
  SITE_PREVIEW_IMAGE_URL,
  type PageSeoData
} from '~/utils/seo';
import { getSubjectDisplayName, type SubjectInfo, type WebBgmSubject } from '~/utils/subject';

/** Selects the primary heading for resources and other filter-driven pages. */
export function generateResourcesPageHeading(
  filter: Jsonify<ResolvedFilterOptions> | ResolvedFilterOptions,
  subjects: Record<number, Pick<SubjectInfo, 'title'>>
) {
  if (filter.subjects) {
    const names = [];
    for (const id of filter.subjects) {
      const name = getSubjectDisplayName(subjects[id]);
      if (name) names.push(name);
    }
    if (names.length > 0) {
      return buildNamedResourcesHeading(
        names.join(' '),
        filter.subjects.length === 1 && names.length === 1
          ? getSinglePublisherName(filter)
          : undefined
      );
    }
  }
  if (filter.search?.length) {
    return buildNamedResourcesHeading(
      filter.search.join(' '),
      filter.search.length === 1 ? getSinglePublisherName(filter) : undefined
    );
  }
  if (filter.include?.length) return `${filter.include[0]} 最新动画资源`;
  if (filter.keywords?.length === 1) {
    return buildNamedResourcesHeading(filter.keywords[0], getSinglePublisherName(filter));
  }
  if (filter.preset) return `${PRESET_DISPLAY_NAME[filter.preset]} 最新动画资源`;
  if (filter.fansubs?.length === 1) return `${filter.fansubs[0]} 最新动画资源`;
  if (filter.publishers?.length === 1) return `${filter.publishers[0]} 最新动画资源`;
  if (filter.types?.length === 1) return `最新${filter.types[0]}资源`;
  return '所有资源';
}

function getSinglePublisherName(filter: Jsonify<ResolvedFilterOptions> | ResolvedFilterOptions) {
  if (filter.fansubs?.length === 1) return filter.fansubs[0];
  if (filter.publishers?.length === 1) return filter.publishers[0];
  return undefined;
}

function buildNamedResourcesHeading(name: string, publisher?: string) {
  return `${name}${publisher ? ` ${publisher}` : ''} 最新动画资源`;
}

/** Returns filtered resources SEO data shared by HTML and Markdown responses. */
export function buildResourcesPageSeo(
  filter: ResolvedFilterOptions | undefined,
  subjects: Record<number, Pick<WebBgmSubject, 'title'>> = {}
): PageSeoData & { heading: string } {
  const resolvedFilter = filter ?? {};
  const heading = generateResourcesPageHeading(resolvedFilter, subjects);
  const filterText = generateResourcesFilterDescription(resolvedFilter, subjects);

  return {
    heading,
    title: buildPageTitle(heading),
    description: filterText
      ? truncate(`${heading}。筛选条件：${filterText}。`, 160)
      : 'Anime Garden 动画 BT 资源聚合列表，支持按作品、字幕组、发布者、资源类型和发布时间筛选。',
    image: SITE_PREVIEW_IMAGE_URL,
    imageAlt: 'Anime Garden 最新动画资源'
  };
}

/** Formats resource filters as a concise, human-readable description instead of query syntax. */
export function generateResourcesFilterDescription(
  filter: ResolvedFilterOptions,
  subjects: Record<number, Pick<WebBgmSubject, 'title'>> = {}
) {
  const parts: string[] = [];
  const addValues = (label: string, values: string[] | undefined) => {
    const normalized = values?.map(normalizeSeoText).filter(Boolean);
    if (normalized?.length) parts.push(`${label}${normalized.map(quote).join('、')}`);
  };

  if (filter.preset) parts.push(`预设${quote(PRESET_DISPLAY_NAME[filter.preset])}`);
  if (filter.subjects?.length) {
    addValues(
      '作品',
      filter.subjects.flatMap((id) => {
        const name = getSubjectDisplayName(subjects[id]);
        return name ? [name] : [];
      })
    );
  }
  addValues('资源类型', filter.types);
  addValues('发布者', filter.publishers);
  addValues('字幕组', filter.fansubs);
  if (filter.provider) parts.push(`来源${quote(filter.provider)}`);
  addValues('标题搜索', filter.search);
  addValues('标题匹配', filter.include);
  addValues('包含关键词', filter.keywords);
  addValues('排除关键词', filter.exclude);
  if (filter.after) parts.push(`发布时间不早于${formatChinaTime(filter.after, 'yyyy-MM-dd')}`);
  if (filter.before) parts.push(`发布时间不晚于${formatChinaTime(filter.before, 'yyyy-MM-dd')}`);
  return parts.join('；');
}

function quote(value: string) {
  return `“${value}”`;
}

/**
 * Resolves the indexing policy for a resources URL.
 *
 * Indexable URLs include the unfiltered list; a single preset, type, fansub, publisher, search, or
 * keyword; a preset combined with one to three types; or a single Subject/search/keyword combined
 * with one fansub/publisher. All accepted array values must be non-empty, and Subject data must be
 * resolvable. Other multi-dimensional filters, multiple values, include, exclude, provider, and
 * date ranges are noindex. Empty result pages and every page after page 1 are also noindex.
 *
 * A single valid Subject filter is the exception: it remains indexable but canonicalizes to the
 * corresponding Subject page instead of the resources URL.
 */
export function resolveResourcesPageIndexing(
  filter: ResolvedFilterOptions | undefined,
  subjects: Record<number, Pick<WebBgmSubject, 'title'>> = {},
  hasResults?: boolean,
  page = 1
) {
  // Only the first page participates in the indexing whitelist. Later pages keep their own
  // canonical URL but must not compete with the primary landing page in search results.
  if (page !== 1) {
    return { indexable: false, canonicalSubjectId: undefined };
  }

  const resolvedFilter = filter ?? {};
  const activeFilters = getActiveResourceFilters(resolvedFilter);
  const singleSubjectId =
    activeFilters.length === 1 &&
    activeFilters[0] === 'subjects' &&
    resolvedFilter.subjects?.length === 1 &&
    subjects[resolvedFilter.subjects[0]]
      ? resolvedFilter.subjects[0]
      : undefined;

  // The Subject page owns the search signal for a subject-only resources URL.
  if (singleSubjectId !== undefined) {
    return { indexable: true, canonicalSubjectId: singleSubjectId };
  }

  // A filter is simple only when it is the sole active dimension and has one usable value.
  const simpleFilter =
    activeFilters.length === 1 && isSimpleIndexableFilter(activeFilters[0], resolvedFilter);
  const presetWithTypes = isIndexablePresetWithTypes(activeFilters, resolvedFilter);
  const nameWithPublisher = isIndexableNameWithPublisher(activeFilters, resolvedFilter, subjects);
  return {
    indexable:
      hasResults !== false &&
      (activeFilters.length === 0 || simpleFilter || presetWithTypes || nameWithPublisher),
    canonicalSubjectId: undefined
  };
}

function getActiveResourceFilters(filter: ResolvedFilterOptions) {
  const active: Array<keyof ResolvedFilterOptions> = [];
  if (filter.preset) active.push('preset');
  if (filter.provider) active.push('provider');
  if (filter.types?.length) active.push('types');
  if (filter.after) active.push('after');
  if (filter.before) active.push('before');
  if (filter.fansubs?.length) active.push('fansubs');
  if (filter.publishers?.length) active.push('publishers');
  if (filter.subjects?.length) active.push('subjects');
  if (filter.search?.length) active.push('search');
  if (filter.include?.length) active.push('include');
  if (filter.keywords?.length) active.push('keywords');
  if (filter.exclude?.length) active.push('exclude');
  return active;
}

function isSimpleIndexableFilter(key: keyof ResolvedFilterOptions, filter: ResolvedFilterOptions) {
  if (key === 'preset') return true;
  switch (key) {
    case 'types':
    case 'fansubs':
    case 'publishers':
    case 'search':
    case 'keywords':
      return hasUsableValues(key, filter, 1);
    default:
      return false;
  }
}

function isIndexablePresetWithTypes(
  activeFilters: Array<keyof ResolvedFilterOptions>,
  filter: ResolvedFilterOptions
) {
  return (
    activeFilters.length === 2 &&
    activeFilters.includes('preset') &&
    activeFilters.includes('types') &&
    hasUsableValues('types', filter, 3)
  );
}

function isIndexableNameWithPublisher(
  activeFilters: Array<keyof ResolvedFilterOptions>,
  filter: ResolvedFilterOptions,
  subjects: Record<number, Pick<WebBgmSubject, 'title'>>
) {
  if (activeFilters.length !== 2) return false;
  const nameKey = activeFilters.find(
    (key) => key === 'subjects' || key === 'search' || key === 'keywords'
  );
  const publisherKey = activeFilters.find((key) => key === 'fansubs' || key === 'publishers');
  const hasUsableName =
    nameKey === 'subjects'
      ? filter.subjects?.length === 1 && subjects[filter.subjects[0]] !== undefined
      : nameKey !== undefined && hasUsableValues(nameKey, filter, 1);
  return hasUsableName && publisherKey !== undefined && hasUsableValues(publisherKey, filter, 1);
}

function hasUsableValues(
  key: 'types' | 'fansubs' | 'publishers' | 'search' | 'keywords',
  filter: ResolvedFilterOptions,
  maxValues: number
) {
  const values = filter[key];
  return (
    Array.isArray(values) &&
    values.length >= 1 &&
    values.length <= maxValues &&
    values.every((value) => normalizeSeoText(value).length > 0)
  );
}

/** Builds the complete HTML head configuration for a resources page. */
export function buildResourcesPageHead(
  filter: ResolvedFilterOptions | undefined,
  subjects: Record<number, Pick<WebBgmSubject, 'title'>> | undefined,
  page: number,
  hasResults?: boolean
) {
  const resolvedFilter = filter ?? {};
  const resolvedSubjects = subjects ?? {};
  const search = stringifyURLSearch(resolvedFilter);
  const indexing = resolveResourcesPageIndexing(resolvedFilter, resolvedSubjects, hasResults, page);
  const canonical = indexing.canonicalSubjectId
    ? getCanonicalURL(`/subject/${indexing.canonicalSubjectId}`)
    : getCanonicalURL(`/resources/${page}`, search.toString());
  const seo = buildResourcesPageSeo(resolvedFilter, resolvedSubjects);
  const social = { ...seo, url: canonical };

  return {
    meta: [
      { title: seo.title },
      { name: 'description', content: seo.description },
      ...(!indexing.indexable ? [NoIndexMeta] : []),
      ...buildOpenGraphMeta(social),
      ...buildTwitterCardMeta(social)
    ],
    links: [{ rel: 'canonical', href: canonical }]
  };
}
