import type { PaginationResult, ResourceDetail, ResolvedFilterOptions } from '../types';

/** Validates the required Resource fields and restores serialized date values in place. */
export function normalizeResourcePayload(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.publisher)) return false;
  const publisher = value.publisher;
  if (
    typeof value.id !== 'number' ||
    typeof value.provider !== 'string' ||
    typeof value.providerId !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.href !== 'string' ||
    typeof value.type !== 'string' ||
    typeof value.magnet !== 'string' ||
    typeof value.size !== 'number' ||
    typeof publisher.id !== 'number' ||
    typeof publisher.name !== 'string'
  ) {
    return false;
  }

  const createdAt = toValidDate(value.createdAt);
  const fetchedAt = toValidDate(value.fetchedAt);
  if (!createdAt || !fetchedAt) return false;

  value.createdAt = createdAt;
  value.fetchedAt = fetchedAt;
  return true;
}

/** Validates pagination metadata shared by resource lists and collection results. */
export function isPaginationPayload(value: unknown): value is PaginationResult {
  return (
    isRecord(value) &&
    typeof value.page === 'number' &&
    typeof value.pageSize === 'number' &&
    typeof value.complete === 'boolean'
  );
}

/** Validates a resolved filter and restores its serialized date fields in place. */
export function normalizeResolvedFilterPayload(value: unknown): value is ResolvedFilterOptions {
  if (!isRecord(value)) return false;

  if (!isOptionalType(value.preset, 'string')) return false;
  if (!isOptionalType(value.provider, 'string')) return false;
  if (!isOptionalType(value.duplicate, 'boolean')) return false;
  if (!isOptionalArray(value.types, 'string')) return false;
  if (!isOptionalArray(value.fansubs, 'string')) return false;
  if (!isOptionalArray(value.publishers, 'string')) return false;
  if (!isOptionalArray(value.subjects, 'number')) return false;
  if (!isOptionalArray(value.search, 'string')) return false;
  if (!isOptionalArray(value.include, 'string')) return false;
  if (!isOptionalArray(value.keywords, 'string')) return false;
  if (!isOptionalArray(value.exclude, 'string')) return false;

  for (const key of ['before', 'after'] as const) {
    if (value[key] === undefined) continue;
    const date = toValidDate(value[key]);
    if (!date) return false;
    value[key] = date;
  }

  return true;
}

/** Validates the optional scraped detail payload used by detail consumers. */
export function isResourceDetailPayload(value: unknown): value is ResourceDetail {
  if (!isRecord(value)) return false;
  return (
    typeof value.description === 'string' &&
    typeof value.hasMoreFiles === 'boolean' &&
    Array.isArray(value.files) &&
    value.files.every(
      (file) => isRecord(file) && typeof file.name === 'string' && typeof file.size === 'string'
    ) &&
    Array.isArray(value.magnets) &&
    value.magnets.every(
      (magnet) =>
        isRecord(magnet) && typeof magnet.name === 'string' && typeof magnet.url === 'string'
    )
  );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toValidDate(value: unknown): Date | undefined {
  try {
    if (!(value instanceof Date) && typeof value !== 'string' && typeof value !== 'number') {
      return undefined;
    }
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  } catch {
    return undefined;
  }
}

function isOptionalType(value: unknown, type: 'string' | 'boolean') {
  return value === undefined || typeof value === type;
}

function isOptionalArray(value: unknown, itemType: 'string' | 'number') {
  return (
    value === undefined || (Array.isArray(value) && value.every((item) => typeof item === itemType))
  );
}
