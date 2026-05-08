import { ResourcesSlowQueryBusyError, ResourcesSlowQueryTimeoutError } from '../../error.ts';

export interface ResourcesQueryErrorResponse {
  status: 503 | 504;

  message: string;
}

export function getResourcesQueryErrorResponse(
  error: unknown
): ResourcesQueryErrorResponse | undefined {
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
