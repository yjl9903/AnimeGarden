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
  if (
    params.has('page') ||
    params.has('pageSize') ||
    body?.page !== undefined ||
    body?.pageSize !== undefined
  ) {
    throw new ResourcesQueryValidationError('page and pageSize are no longer supported.');
  }

  const { pagination: input, filter } = parseURLSearch(params, body);
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
