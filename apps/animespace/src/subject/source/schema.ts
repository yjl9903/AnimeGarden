import { dedupePreserveOrder, isRecord, resolveStringList } from '../../utils/resolver.ts';

import { parseAnimeGardenSource } from '../animegarden/schema.ts';

import type {
  KeywordsOrder,
  MatchContain,
  ResourceRewriteApply,
  ResourceRewriteMatch,
  ResourceRewriteRule,
  ResourcesOrder,
  SubjectSource
} from './source.ts';

export const enum SubjectType {
  TV = 'TV',
  Movie = 'Movie'
}

export function resolveSubjectType(raw: string): SubjectType | undefined {
  if (raw === SubjectType.TV || raw.toLowerCase() === 'tv' || raw === '动画') {
    return SubjectType.TV;
  }
  if (raw === SubjectType.Movie || raw.toLowerCase() === 'movie' || raw === '电影') {
    return SubjectType.Movie;
  }
  return undefined;
}

const SOURCE_SHORTCUT_FILTER_KEYS = [
  'after',
  'before',
  'search',
  'include',
  'keywords',
  'exclude',
  'type',
  'types',
  'subject',
  'subjects',
  'fansub',
  'fansubs',
  'publisher',
  'publishers'
] as const;

export function parseSubjectSource(raw: unknown, field = 'source'): SubjectSource {
  if (!isRecord(raw)) {
    throw new Error(`${field} must be an object.`);
  }
  if (Object.keys(raw).length === 0) {
    throw new Error(`${field} cannot be empty.`);
  }

  if ('feed' in raw || 'magnet' in raw || 'torrent' in raw) {
    throw new Error(`${field}.feed/magnet/torrent is not supported yet.`);
  }

  const hasAnimeGarden = Object.prototype.hasOwnProperty.call(raw, 'animegarden');
  const hasShortcutFields = SOURCE_SHORTCUT_FILTER_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(raw, key)
  );
  if (hasAnimeGarden && hasShortcutFields) {
    throw new Error(
      `${field}.animegarden cannot be used with shortcut fields on ${field} at the same time.`
    );
  }

  const parsedAnimeGarden = hasAnimeGarden
    ? parseAnimeGardenSource(raw.animegarden, `${field}.animegarden`)
    : hasShortcutFields
      ? parseAnimeGardenSource(raw, field)
      : undefined;

  if (!parsedAnimeGarden) {
    throw new Error(
      `${field}.animegarden is required for now and must satisfy source.animegarden search rules.`
    );
  }

  const rewrite = parseRewriteRules(raw.rewrite, `${field}.rewrite`);
  const order = parseSourceOrder(raw.order, `${field}.order`);

  return {
    animegarden: parsedAnimeGarden,
    rewrite,
    order
  };
}

export function parseSourceOrder(raw: unknown, field: string): ResourcesOrder {
  if (raw === undefined || raw === null) {
    return {
      fansubs: undefined,
      keywords: undefined
    };
  }
  if (!isRecord(raw)) {
    throw new Error(`${field} must be an object.`);
  }

  const hasFansubs = Object.prototype.hasOwnProperty.call(raw, 'fansubs');
  const fansubs = hasFansubs ? parseFansubsOrder(raw.fansubs, `${field}.fansubs`) : undefined;

  const hasKeywords = Object.prototype.hasOwnProperty.call(raw, 'keywords');
  const keywords = hasKeywords ? parseKeywordsOrder(raw.keywords, `${field}.keywords`) : undefined;

  return {
    fansubs,
    keywords
  };
}

function parseFansubsOrder(raw: unknown, field: string): string[] {
  if (raw === undefined || raw === null) {
    return [];
  }
  if (Array.isArray(raw)) {
    const normalized = raw
      .map((item) => {
        if (typeof item !== 'string') {
          throw new Error(`${field} must be string array.`);
        }
        return item.trim();
      })
      .filter((item) => item.length > 0);
    return dedupePreserveOrder(normalized);
  }
  if (typeof raw === 'string') {
    const normalized = raw.trim();
    return normalized.length > 0 ? [normalized] : [];
  }
  throw new Error(`${field} must be string or string array.`);
}

function parseKeywordsOrder(raw: unknown, field: string): KeywordsOrder | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (!isRecord(raw)) {
    throw new Error(`${field} must be an object of string arrays.`);
  }

  const result: KeywordsOrder = [];
  for (const [name, value] of Object.entries(raw)) {
    if (!Array.isArray(value)) {
      throw new Error(`${field}.${name} must be string array.`);
    }

    const keywords = value
      .map((item) => {
        if (typeof item !== 'string') {
          throw new Error(`${field}.${name} must be string array.`);
        }
        return item.trim();
      })
      .filter((item) => item.length > 0);
    const deduped = dedupePreserveOrder(keywords);
    if (deduped.length === 0) {
      throw new Error(`${field}.${name} cannot be empty.`);
    }

    result.push({ name, keywords: deduped });
  }

  return result;
}

function parseRewriteRules(raw: unknown, field: string): ResourceRewriteRule[] {
  if (raw === undefined || raw === null) {
    return [];
  }
  if (!Array.isArray(raw)) {
    throw new Error(`${field} must be an array.`);
  }

  return raw.map((item, index) => parseRewriteRule(item, `${field}[${index}]`));
}

function parseRewriteRule(raw: unknown, field: string): ResourceRewriteRule {
  if (!isRecord(raw)) {
    throw new Error(`${field} must be an object.`);
  }

  const match = parseRewriteMatch(raw.match, `${field}.match`);
  const apply = parseRewriteApply(raw.apply, `${field}.apply`);

  return { match, apply };
}

function parseRewriteMatch(raw: unknown, field: string): ResourceRewriteMatch {
  if (!isRecord(raw)) {
    return {};
  }

  const match: ResourceRewriteMatch = {};

  if (Object.prototype.hasOwnProperty.call(raw, 'url')) {
    match.url = parseContainStringMatch(raw.url, `${field}.url`);
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'fansub')) {
    match.fansub = parseContainStringMatch(raw.fansub, `${field}.fansub`);
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'season')) {
    match.season = parseContainSeasonMatch(raw.season, `${field}.season`);
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'episode')) {
    match.episode = parseEpisodeMatch(raw.episode, `${field}.episode`);
  }

  return match;
}

function parseRewriteApply(raw: unknown, field: string): ResourceRewriteApply {
  if (!isRecord(raw)) {
    return {};
  }

  const apply: ResourceRewriteApply = {};

  if (Object.prototype.hasOwnProperty.call(raw, 'season')) {
    apply.season = parseInteger(raw.season, `${field}.season`);
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'episode')) {
    apply.episode = parseInteger(raw.episode, `${field}.episode`);
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'episode_offset')) {
    apply.episodeOffset = parseInteger(raw.episode_offset, `${field}.episode_offset`);
  }

  return apply;
}

function parseContainStringMatch(raw: unknown, field: string): MatchContain<string> {
  const source = unwrapContainInput(raw, field);
  const contain = resolveStringList(source, `${field}.contain`);
  if (!contain || contain.length === 0) {
    throw new Error(`${field}.contain cannot be empty.`);
  }

  return { contain };
}

function parseContainSeasonMatch(raw: unknown, field: string): MatchContain<number | null> {
  const source = unwrapContainInput(raw, field);
  const input = Array.isArray(source) ? source : [source];
  if (input.length === 0) {
    throw new Error(`${field}.contain cannot be empty.`);
  }

  const contain = input.map((item, index) => {
    if (item === null) {
      return null;
    }
    return parseInteger(item, `${field}.contain[${index}]`);
  });

  return { contain: dedupePreserveOrder(contain) };
}

function parseEpisodeMatch(
  raw: unknown,
  field: string
): MatchContain<number | null> | { range: [number, number] } {
  if (Number.isInteger(raw) || Array.isArray(raw)) {
    return parseEpisodeContainMatch(raw, field);
  }
  if (typeof raw === 'string') {
    return parseEpisodeRangeString(raw, field);
  }
  if (!isRecord(raw)) {
    throw new Error(`${field} must be integer, integer array, range string, or object.`);
  }

  const hasContain = Object.prototype.hasOwnProperty.call(raw, 'contain');
  const hasRange = Object.prototype.hasOwnProperty.call(raw, 'range');
  if (hasContain === hasRange) {
    throw new Error(`${field} must define exactly one of contain or range.`);
  }

  if (hasContain) {
    return parseEpisodeContainMatch(raw.contain, field);
  }

  if (!Array.isArray(raw.range) || raw.range.length !== 2) {
    throw new Error(`${field}.range must be a tuple of [start, end].`);
  }

  const start = parseInteger(raw.range[0], `${field}.range[0]`);
  const end = parseInteger(raw.range[1], `${field}.range[1]`);
  if (start > end) {
    throw new Error(`${field}.range start cannot be greater than end.`);
  }

  const range: [number, number] = [start, end];
  return { range };
}

function parseEpisodeContainMatch(raw: unknown, field: string): MatchContain<number | null> {
  const input = Array.isArray(raw) ? raw : [raw];
  if (input.length === 0) {
    throw new Error(`${field}.contain cannot be empty.`);
  }

  const contain = input.map((item, index) => parseInteger(item, `${field}.contain[${index}]`));
  return { contain: dedupePreserveOrder(contain) };
}

function parseEpisodeRangeString(raw: string, field: string): { range: [number, number] } {
  const text = raw.trim();
  if (text.length === 0) {
    throw new Error(`${field} cannot be empty.`);
  }

  const ge = text.match(/^>=\s*(-?\d+)$/);
  if (ge) {
    const start = parseIntegerText(ge[1]!, `${field}`);
    return { range: [start, Number.MAX_SAFE_INTEGER] };
  }

  const gt = text.match(/^>\s*(-?\d+)$/);
  if (gt) {
    const start = parseIntegerText(gt[1]!, `${field}`);
    return { range: [start + 0.1, Number.MAX_SAFE_INTEGER] };
  }

  const le = text.match(/^<=\s*(-?\d+)$/);
  if (le) {
    const end = parseIntegerText(le[1]!, `${field}`);
    return { range: [1, end] };
  }

  const lt = text.match(/^<\s*(-?\d+)$/);
  if (lt) {
    const end = parseIntegerText(lt[1]!, `${field}`);
    return { range: [1, end - 0.1] };
  }

  const closed = text.match(/^\[\s*(-?\d+)\s*,\s*(-?\d+)\s*\]$/);
  if (closed) {
    const start = parseIntegerText(closed[1]!, `${field}`);
    const end = parseIntegerText(closed[2]!, `${field}`);
    if (start > end) {
      throw new Error(`${field}.range start cannot be greater than end.`);
    }
    const range: [number, number] = [start, end];
    return { range };
  }

  throw new Error(`${field} string must be one of "> N", ">= N", "< N", "<= N", "[N, M]".`);
}

function parseIntegerText(raw: string, field: string): number {
  const value = Number(raw.trim());
  if (!Number.isInteger(value)) {
    throw new Error(`${field} must be an integer.`);
  }
  return value;
}

function unwrapContainInput(raw: unknown, field: string): unknown {
  if (!isRecord(raw)) {
    return raw;
  }
  if (!Object.prototype.hasOwnProperty.call(raw, 'contain')) {
    throw new Error(`${field} must be value, array, or { contain: [...] }.`);
  }
  return raw.contain;
}

function parseInteger(raw: unknown, field: string): number {
  if (!Number.isInteger(raw)) {
    throw new Error(`${field} must be an integer.`);
  }
  return raw as number;
}
