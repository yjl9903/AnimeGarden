import type { FetchResourcesOptions, PresetType, Resource } from '@animegarden/client';

import { fetchResources } from '@animegarden/client';

import type { SearchInputResult } from '../../../../../apps/web/src/layouts/Search/parse';

import { DEFAULT_LIMIT } from '../../shared/limit';
import { RESOURCE_TYPES } from '../../shared/resource';
import { toResourceDisplay } from '../../shared/resource';

/**
 * Filters the panel submits. Mirrors the `FilterOptions` groups the site syntax
 * can produce, plus the toolbar's type/fan-sub selections; empty groups stay
 * omitted so the request URL only carries active filters.
 */
export interface ResourceFilter {
  search?: string[];
  include?: string[];
  keywords?: string[];
  exclude?: string[];
  fansubs?: string[];
  publishers?: string[];
  types?: string[];
  subjects?: number[];
  after?: Date;
  before?: Date;
  preset?: PresetType;
}

/** Normalized row the panel renders. */
export interface ResourceRow {
  key: string;
  provider: string;
  providerId: string;
  title: string;
  href: string;
  /** AnimeGarden detail page for this provider resource. */
  detailUrl: string;
  type: string;
  magnet: string;
  keepshareUrl: string;
  size: number;
  sizeText: string;
  fansub: string;
  publisher: string;
  createdAt: Date;
  typeKey: string;
}

/** One page of mapped resources. */
export interface ResourcePage {
  resources: ResourceRow[];
  page: number;
  complete: boolean;
}

/** Omit an empty filter group so the request only carries active filters. */
function nonEmpty<T>(values: T[]): T[] | undefined {
  return values.length === 0 ? undefined : values;
}

/** Drop a date the free-form search text could not parse (`new Date('x')`). */
function validDate(value: Date | undefined): Date | undefined {
  return value !== undefined && !Number.isNaN(value.getTime()) ? value : undefined;
}

/**
 * Combine the website's human search syntax with the toolbar selections.
 *
 * Plain words become full-text `search`; `+word` keywords, `-word` exclusions and
 * prefix operators such as `字幕组:`/`发布者:`/`类型:`/`开始:` are parsed by the
 * site's own parser. Subjects are accepted only when they are pure digits; the
 * selected types are unioned with types typed into the search box, and the
 * selected fan-subs with fan-subs typed into it.
 *
 * The search box text is the single source of truth for the filter groups, so the
 * toolbar dropdowns and the row tags rewrite tokens into that text. Only the
 * selected Bangumi subject id is carried outside the text (as `subjectId`).
 *
 * @param parsed - the result of parsing the submitted search text.
 * @param subjectId - Bangumi subject id selected from the calendar/hover views,
 *   merged into the subject group although the text shows `动画:"标题"`.
 * @returns the filter groups passed to the shared client.
 */
export function createResourceFilter(
  parsed: SearchInputResult,
  subjectId: number | null = null
): ResourceFilter {
  const subjects = parsed.subjects
    .filter((subject) => /^\d+$/.test(subject))
    .map((subject) => Number(subject));
  if (subjectId !== null) subjects.push(subjectId);

  return {
    search: nonEmpty(parsed.search),
    include: nonEmpty(parsed.include),
    keywords: nonEmpty(parsed.keywords),
    exclude: nonEmpty(parsed.exclude),
    fansubs: nonEmpty(Array.from(new Set(parsed.fansubs))),
    publishers: nonEmpty(parsed.publishers),
    types: nonEmpty(Array.from(new Set(parsed.types))),
    subjects: nonEmpty(Array.from(new Set(subjects))),
    after: validDate(parsed.after),
    before: validDate(parsed.before),
    preset: parsed.preset
  };
}

/** Look up the locale key for one API type value. */
function typeKeyOf(value: string): string {
  const match = RESOURCE_TYPES.find((entry) => entry.value === value);
  return match === undefined ? '' : match.key;
}

/** Fixed `yyyy-MM-dd HH:mm` formatter in the site's China time zone (web parity). */
const CHINA_TIME_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
});

/**
 * Render a resource timestamp as `yyyy-MM-dd HH:mm` in Asia/Shanghai, matching the
 * website's `formatChinaTime`. Assembled with `Intl.DateTimeFormat` so the panel
 * does not pull in date-fns/date-fns-tz.
 * @param value - a Date from `@animegarden/client` (ISO strings and epochs also parse).
 * @returns the formatted China time, or an empty string for an invalid date.
 */
export function formatChinaTime(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = CHINA_TIME_FORMATTER.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((entry) => entry.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}`;
}

/**
 * Normalize one `@animegarden/client` Resource into the fields the panel
 * renders. The shared display projection supplies the KeepShare link, size text,
 * and party names; the panel adds its row key and locale type key.
 * @param resource - a validated resource from `fetchResources`.
 * @returns the row model.
 */
export function mapResource(resource: Resource): ResourceRow {
  const display = toResourceDisplay(resource);
  return {
    key: `${display.href}#${String(resource.id)}`,
    ...display,
    typeKey: typeKeyOf(display.type)
  };
}

/**
 * Fetch one page of resources through the repository's shared API client.
 *
 * `fetchResources` validates the response, maps dates to `Date`, and accepts an
 * `AbortSignal` through its FetchOptions, so React Query can cancel stale pages.
 * @param filter - the parsed search syntax plus the selected type chips.
 * @param page - the requested page number (1-based).
 * @param signal - aborts the request when React Query cancels the fetch.
 * @returns the mapped resources plus the server pagination state.
 */
export async function requestResources(
  filter: ResourceFilter,
  page: number,
  signal?: AbortSignal
): Promise<ResourcePage> {
  const options: FetchResourcesOptions = {
    page,
    pageSize: DEFAULT_LIMIT,
    signal,
    search: filter.search,
    include: filter.include,
    keywords: filter.keywords,
    exclude: filter.exclude,
    fansubs: filter.fansubs,
    publishers: filter.publishers,
    types: filter.types,
    subjects: filter.subjects,
    after: filter.after,
    before: filter.before,
    preset: filter.preset
  };
  const result = await fetchResources(options);

  // The panel renders `error.message`; a cancelled request is not surfaced by React Query.
  if (!result.ok) {
    const message = result.error.message === '' ? 'Request failed' : result.error.message;
    throw new Error(`${message} (${result.code})`);
  }

  return {
    resources: result.resources.map(mapResource),
    page: result.pagination.page,
    complete: result.pagination.complete
  };
}
