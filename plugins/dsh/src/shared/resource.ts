/**
 * Resource display projection shared by the Host tools and the Web panel.
 *
 * Both renderers derive the same display fields from one validated
 * `@animegarden/client` resource (size text, KeepShare playback link, fansub and
 * publisher names); they only differ in the surrounding shape they build.
 */

import type { Resource } from '@animegarden/client';

import { parseSize } from '@animegarden/shared';

import { keepshareUrl } from './keepshare';

/** Public AnimeGarden site origin used for in-site detail routes. */
const WEB_ORIGIN = 'https://animes.garden';

/**
 * Display fields derived from one validated client resource.
 *
 * Follows the field order of `Resource` in `@animegarden/client`; derived fields
 * (`detailUrl`, `keepshareUrl`, `sizeText`) sit next to their source field.
 */
export interface ResourceDisplay {
  provider: string;
  providerId: string;
  title: string;
  href: string;
  type: string;
  magnet: string;
  size: number;
  sizeText: string;
  fansub: string;
  publisher: string;
  createdAt: Date;
  /** AnimeGarden detail page URL, or an empty string when the ids are missing. */
  detailUrl: string;
  keepshareUrl: string;
}

/** AnimeGarden detail URL for one provider resource. */
export function resourceDetailURL(provider: string, providerId: string): string {
  return provider === '' || providerId === ''
    ? ''
    : `${WEB_ORIGIN}/detail/${provider}/${providerId}`;
}

/**
 * Project one validated client resource onto the fields shared by every renderer.
 * Unknown values degrade to an empty string or zero instead of throwing.
 *
 * @param resource - one `Resource` from `@animegarden/client`.
 * @returns the shared display fields.
 */
export function toResourceDisplay(resource: Resource): ResourceDisplay {
  const magnet = resource.magnet;
  const size = Number.isFinite(resource.size) ? Math.trunc(resource.size) : 0;

  return {
    provider: resource.provider,
    providerId: resource.providerId,
    title: resource.title,
    href: resource.href,
    detailUrl: resourceDetailURL(resource.provider, resource.providerId),
    type: resource.type,
    magnet,
    keepshareUrl: keepshareUrl(magnet),
    size,
    sizeText: parseSize(size),
    fansub: resource.fansub?.name ?? '',
    publisher: resource.publisher.name,
    createdAt: resource.createdAt
  };
}

/** One resource type: `key` selects the locale copy, `value` is the API value. */
export interface ResourceType {
  key: string;
  value: string;
}

/**
 * Resource categories accepted by the public API's `type` parameter.
 * Order follows the site's resource categories, common ones first.
 */
export const RESOURCE_TYPES: readonly ResourceType[] = [
  { key: 'anime', value: '动画' },
  { key: 'collection', value: '合集' },
  { key: 'music', value: '音乐' },
  { key: 'drama', value: '日剧' },
  { key: 'raw', value: 'RAW' },
  { key: 'manga', value: '漫画' },
  { key: 'game', value: '游戏' },
  { key: 'tokusatsu', value: '特摄' },
  { key: 'other', value: '其他' }
];

/** API values of the catalog, in the same order. */
export const RESOURCE_TYPE_VALUES: readonly string[] = RESOURCE_TYPES.map((entry) => entry.value);
