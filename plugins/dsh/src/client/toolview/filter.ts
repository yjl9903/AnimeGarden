/**
 * Human-readable summary of the filter groups the server actually applied.
 *
 * The card reads the resolved filter from the result text (see
 * `parseAppliedFilter`) and describes it with the same labels as the toolbar:
 * `类型 动画、字幕组 喵萌奶茶屋` etc. Type values are localised through the
 * shared type catalog, dates through the site's China-time format.
 */

import type { TranslateFunction } from '../i18n.js';

import { RESOURCE_TYPES } from '../../shared/resource';

import type { AppliedFilter } from './parse.js';

/** Group order in the description: title matching, sources, type, then time. */
const FILTER_ORDER: readonly string[] = [
  'search',
  'include',
  'keywords',
  'exclude',
  'types',
  'fansubs',
  'publishers',
  'subjects',
  'provider',
  'preset',
  'after',
  'before'
];

/** Localise one resource type value through the shared catalog. */
function typeLabel(value: unknown, t: TranslateFunction): string {
  const raw = String(value);
  const match = RESOURCE_TYPES.find((entry) => entry.value === raw);
  return match === undefined ? raw : t(`type.${match.key}`);
}

/** Render one group's values, joining list members with `、`. */
function valueText(key: string, value: unknown, t: TranslateFunction): string {
  const render = (item: unknown): string => (key === 'types' ? typeLabel(item, t) : String(item));
  if (Array.isArray(value)) return value.map(render).join('、');
  return render(value);
}

/**
 * Describe the applied filters in one short line.
 *
 * @param filter - filter groups parsed from the result text.
 * @param t - translate seat bound to the plugin namespace.
 * @returns `类型 动画、字幕组 喵萌 找到 12 个资源`-style text, or a plain count when no filter applies.
 */
export function describeAppliedFilter(filter: AppliedFilter, t: TranslateFunction): string {
  const parts: string[] = [];
  for (const key of FILTER_ORDER) {
    const value = filter[key];
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;

    if (key === 'after' || key === 'before') {
      const date = String(value).slice(0, 10);
      if (date !== '') parts.push(t(`filter.${key}`, { date }));
      continue;
    }
    parts.push(`${t(`filter.${key}`)} ${valueText(key, value, t)}`);
  }
  return parts.join(t('filter.join'));
}
