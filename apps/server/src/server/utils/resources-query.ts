import {
  ResourcesDeepPaginationError,
  ResourcesSlowQueryBusyError,
  ResourcesSlowQueryTimeoutError
} from '../../error.ts';

import type { ResolvedPaginationOptions } from '@animegarden/client';

export const MAX_RESOURCES_OFFSET_LIMIT = 10000;

export interface ResourcesQueryErrorResponse {
  status: 400 | 503 | 504;

  message: string;
}

export function assertResourcesPagination(pagination: ResolvedPaginationOptions) {
  const offset = (pagination.page - 1) * pagination.pageSize;
  if (offset + pagination.pageSize > MAX_RESOURCES_OFFSET_LIMIT) {
    throw new ResourcesDeepPaginationError(MAX_RESOURCES_OFFSET_LIMIT);
  }
}

export function getResourcesQueryErrorResponse(
  error: unknown
): ResourcesQueryErrorResponse | undefined {
  if (error instanceof ResourcesDeepPaginationError) {
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
