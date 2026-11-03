/**
 * Argument normalization and client-option mapping for the
 * `animegarden_search_resources` tool.
 *
 * The tool's flat arguments are validated and clamped here, then mapped onto
 * `FetchResourcesOptions` from `@animegarden/client`; the client owns URL
 * serialization, HTTP access, and response validation.
 *
 * The tool surface has no `page`: it always reads the first result set. The
 * result count is named `limit` and translated to the client's `pageSize`
 * option in `api.ts`.
 */

import type { ProviderType } from '@animegarden/client';

import { SupportPresets, SupportProviders } from '@animegarden/client';

import type { ResolvedOptions } from '../shared/types';

import { RESOURCE_TYPE_VALUES } from '../../shared/resource';
import { DEFAULT_LIMIT, clampLimit } from '../../shared/limit';
import { sortedUnique, toArray, toTimestamp } from '../shared/utils';

import type { FetchRequest, SearchFilters } from './types';

/** Whether a value is a provider id supported by the public client. */
function isProvider(value: string): value is ProviderType {
  return SupportProviders.some((provider) => provider === value);
}

/**
 * Map the tool arguments onto the filter options of one search request.
 *
 * Values inside one filter group are OR; groups combine with AND. `search`
 * takes precedence over `include`, so `include` is only sent when no search
 * term is present (the same rule the client's own query stringifier applies).
 *
 * @param options - resolved bundle config.
 * @param args - tool arguments.
 * @returns the clamped limit, search term, and mapped filter options.
 */
export function buildFetchOptions(
  options: ResolvedOptions,
  args: Record<string, unknown>
): FetchRequest {
  const limit = clampLimit(args.limit, DEFAULT_LIMIT);
  const search = sortedUnique(
    toArray(args.search)
      .map((term) => term.trim())
      .filter(Boolean)
  );
  const filters: SearchFilters = {};

  if (search.length > 0) filters.search = search;
  const keywords = sortedUnique(toArray(args.keywords));
  if (keywords.length > 0) filters.keywords = keywords;
  const exclude = sortedUnique(toArray(args.exclude));
  if (exclude.length > 0) filters.exclude = exclude;
  const include = sortedUnique(toArray(args.include));
  if (search.length === 0 && include.length > 0) filters.include = include;

  const types = sortedUnique(toArray(args.types));
  for (const type of types) {
    if (!RESOURCE_TYPE_VALUES.includes(type)) {
      throw new Error(
        `Invalid "types" value "${type}": expected one of ${RESOURCE_TYPE_VALUES.join(', ')}.`
      );
    }
  }
  if (types.length > 0) filters.types = types;

  const fansubs = sortedUnique(toArray(args.fansubs));
  if (fansubs.length > 0) filters.fansubs = fansubs;
  const publishers = sortedUnique(toArray(args.publishers));
  if (publishers.length > 0) filters.publishers = publishers;

  // The tool schema supplies integer ids; the string-only helper would drop them.
  const rawSubjects = args.subjects === undefined ? [] : args.subjects;
  const subjects = [
    ...new Set(
      (Array.isArray(rawSubjects) ? rawSubjects : [rawSubjects]).map((value: unknown) => {
        const subject =
          typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')
            ? Number(value)
            : NaN;
        if (!Number.isSafeInteger(subject) || subject <= 0) {
          throw new Error(
            `Invalid "subjects" value "${String(value)}": expected a positive integer.`
          );
        }
        return subject;
      })
    )
  ].sort((left, right) => left - right);
  if (subjects.length > 0) filters.subjects = subjects;

  const preset = args.preset;
  if (preset !== undefined && preset !== null) {
    if (typeof preset !== 'string' || !SupportPresets.some((value) => value === preset)) {
      throw new Error(
        `Invalid "preset" value "${String(preset)}": expected one of ${SupportPresets.join(', ')}.`
      );
    }
    filters.preset = preset;
  }

  // `provider` is optional and defaults to unset: leaving it empty must search
  // every source, so an empty value never becomes a filter.
  const rawProvider = args.provider;
  const provider = typeof rawProvider === 'string' ? rawProvider.trim() : rawProvider;
  if (provider !== undefined && provider !== null && provider !== '') {
    if (typeof provider !== 'string' || !isProvider(provider)) {
      throw new Error(
        `Invalid "provider" value "${String(provider)}": expected one of ${SupportProviders.join(', ')}.`
      );
    }
    filters.provider = provider;
  }

  const after = toTimestamp(args.after, 'after');
  if (after !== undefined) filters.after = new Date(after);
  const before = toTimestamp(args.before, 'before');
  if (before !== undefined) filters.before = new Date(before);

  return { limit, filters };
}
