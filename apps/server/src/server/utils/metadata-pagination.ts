/** Pagination metadata attached to a metadata endpoint response when pagination is enabled. */
export interface MetadataPagination {
  /** The current page, starting from 1. */
  page: number;

  /** The requested page size. */
  pageSize: number;

  /** Whether there are no more items after this page. */
  complete: boolean;
}

function parseQueryInteger(value: string | null): number | undefined {
  if (value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : undefined;
}

/**
 * Slices a fully in-memory metadata list by the optional `page` and `pageSize`
 * query parameters.
 *
 * - `page` defaults to 1; invalid or non-positive values fall back to 1.
 * - `pageSize` defaults to 0, which disables pagination and returns the whole
 *   list without a `pagination` field, keeping the response fully backward
 *   compatible with the previous unpaginated behavior.
 * - With `pageSize > 0`, the requested page is returned together with
 *   `pagination: { page, pageSize, complete }`, where `complete` indicates
 *   whether there are more items after this page.
 */
export function paginateMetadataList<T>(
  list: readonly T[],
  searchParams: URLSearchParams
): { result: T[]; pagination?: MetadataPagination } {
  const pageSize = parseQueryInteger(searchParams.get('pageSize')) ?? 0;
  if (pageSize <= 0) {
    return { result: [...list] };
  }

  const page = Math.max(1, parseQueryInteger(searchParams.get('page')) ?? 1);
  const offset = (page - 1) * pageSize;
  // Fetch one extra item to decide whether there are more items after this page.
  const fetched = list.slice(offset, offset + pageSize + 1);
  const complete = fetched.length <= pageSize;

  return {
    result: complete ? fetched : fetched.slice(0, pageSize),
    pagination: { page, pageSize, complete }
  };
}
