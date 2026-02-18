import {
  isRecord,
  resolveDate,
  resolveStringList,
  resolveMergedStringList,
  resolveMergedIntegerList
} from '../../utils/resolver.ts';

export interface AnimeGardenFilter {
  readonly after?: Date;
  readonly before?: Date;
  readonly search?: string[];
  readonly include?: string[];
  readonly keywords?: string[];
  readonly exclude?: string[];
  readonly types?: string[];
  readonly subjects?: number[];
  readonly fansubs?: string[];
  readonly publishers?: string[];
}

export interface AnimeGardenSource {
  readonly filter: AnimeGardenFilter;
}

export function parseAnimeGardenPreference(raw: unknown, field: string): AnimeGardenFilter {
  if (!isRecord(raw)) {
    throw new Error(`${field} must be an object.`);
  }

  return {
    after: resolveDate(raw.after, `${field}.after`),
    before: resolveDate(raw.before, `${field}.before`),
    types: resolveMergedStringList(raw.type, raw.types, `${field}.type`, `${field}.types`),
    fansubs: resolveMergedStringList(
      raw.fansub,
      raw.fansubs,
      `${field}.fansub`,
      `${field}.fansubs`
    ),
    publishers: resolveMergedStringList(
      raw.publisher,
      raw.publishers,
      `${field}.publisher`,
      `${field}.publishers`
    )
  };
}

export function parseAnimeGardenSource(raw: unknown, field: string): AnimeGardenSource {
  if (!isRecord(raw)) {
    throw new Error(`${field} must be an object.`);
  }
  if (Object.keys(raw).length === 0) {
    throw new Error(`${field} cannot be empty.`);
  }

  const filter: AnimeGardenFilter = {
    after: resolveDate(raw.after, `${field}.after`),
    before: resolveDate(raw.before, `${field}.before`),
    search: resolveStringList(raw.search, `${field}.search`),
    include: resolveStringList(raw.include, `${field}.include`),
    keywords: resolveStringList(raw.keywords, `${field}.keywords`),
    exclude: resolveStringList(raw.exclude, `${field}.exclude`),
    types: resolveMergedStringList(raw.type, raw.types, `${field}.type`, `${field}.types`),
    subjects: resolveMergedIntegerList(
      raw.subject,
      raw.subjects,
      `${field}.subject`,
      `${field}.subjects`
    ),
    fansubs: resolveMergedStringList(
      raw.fansub,
      raw.fansubs,
      `${field}.fansub`,
      `${field}.fansubs`
    ),
    publishers: resolveMergedStringList(
      raw.publisher,
      raw.publishers,
      `${field}.publisher`,
      `${field}.publishers`
    )
  };

  const hasSearchKey =
    (filter.include?.length ?? 0) > 0 ||
    (filter.keywords?.length ?? 0) > 0 ||
    (filter.search?.length ?? 0) > 0 ||
    (filter.subjects?.length ?? 0) > 0;

  if (!hasSearchKey) {
    throw new Error(
      'source.animegarden requires at least one non-empty field: include, keywords, search, subjects.'
    );
  }

  return { filter };
}
