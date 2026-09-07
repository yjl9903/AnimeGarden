import { AnimeGardenError, type AnimeGardenErrorOptions } from '../error';

/** Classifies transport failures using the signal that ended the request, when available. */
export function getRequestErrorCode(error: unknown, signal?: AbortSignal) {
  const reason = signal?.aborted ? signal.reason : error;
  if (reason instanceof Error && reason.name === 'TimeoutError') return 'TIMEOUT';
  if (signal?.aborted || (reason instanceof Error && reason.name === 'AbortError'))
    return 'ABORTED';
  return 'NETWORK_ERROR';
}

/** Normalizes request failures while retaining compatible native cancellation exceptions. */
export function toRequestError(
  message: string,
  error: unknown,
  signal?: AbortSignal,
  context: Pick<AnimeGardenErrorOptions, 'response' | 'body'> = {}
): Error {
  const code = getRequestErrorCode(error, signal);

  // Low-level callers may rely on native cancellation identity. A conflicting signal takes priority.
  if (
    !context.response &&
    error instanceof Error &&
    ((code === 'ABORTED' && error.name === 'AbortError') ||
      (code === 'TIMEOUT' && error.name === 'TimeoutError'))
  ) {
    return error;
  }

  return new AnimeGardenError(message, { ...context, code, original: error });
}
