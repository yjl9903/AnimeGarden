import {
  ResourcesQueryValidationError,
  ResourcesSlowQueryBusyError,
  ResourcesSlowQueryTimeoutError
} from '../../error.ts';

import { parseURLSearch } from '@animegarden/client';
import { decodeResourcesCursor } from '@animegarden/shared';
import type { ResolvedPaginationOptions } from '../../resources/types.ts';

export interface ResourcesQueryErrorResponse {
  status: 400 | 503 | 504;

  message: string;
}

/** Resolves the public wire request once, before either resources or feed invokes the query layer. */
export function parseResourcesQuery(
  params: URLSearchParams,
  body: Record<string, unknown> | undefined
) {
  // Translate legacy sizes before parsing; page is not part of the internal cursor query.
  const query = new URLSearchParams(params);
  if (!query.has('limit') && query.has('pageSize')) {
    query.set('limit', query.get('pageSize')!);
  }
  const requestBody: Record<string, unknown> | undefined =
    body?.limit === undefined && body?.pageSize !== undefined
      ? { ...body, limit: body.pageSize }
      : body;

  const { pagination: input, filter } = parseURLSearch(query, requestBody);
  const pagination: ResolvedPaginationOptions = { limit: input.limit };
  if (input.cursor !== undefined) {
    // Translate wire-format errors at the HTTP boundary, not in the shared codec or query layer.
    try {
      pagination.cursor = decodeResourcesCursor(input.cursor);
    } catch {
      throw new ResourcesQueryValidationError('Invalid cursor.');
    }
  }

  return { pagination, filter };
}

export function getResourcesQueryErrorResponse(
  error: unknown
): ResourcesQueryErrorResponse | undefined {
  if (error instanceof ResourcesQueryValidationError) {
    return {
      status: 400,
      message: error.message
    };
  }

  if (error instanceof ResourcesSlowQueryBusyError) {
    return {
      status: 503,
      message: error.message
    };
  }

  if (error instanceof ResourcesSlowQueryTimeoutError) {
    return {
      status: 504,
      message: error.message
    };
  }

  return undefined;
}

export function getResourcesQueryErrorXml(message: string) {
  const escaped = message
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<error>',
    `<message>${escaped}</message>`,
    '</error>'
  ].join('');
}
