/** Read an HTTP response status from an error or its wrapped cause. */
export function getHTTPStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const response = 'response' in error ? error.response : undefined;
  if (response && typeof response === 'object' && 'status' in response) {
    return typeof response.status === 'number' ? response.status : undefined;
  }
  return 'cause' in error ? getHTTPStatus(error.cause) : undefined;
}
