export type ClientErrorCode =
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'ABORTED'
  | 'INVALID_RESPONSE';

export interface AnimeGardenErrorOptions {
  /** Stable high-level error category. */
  code?: ClientErrorCode;

  /** Whether retrying the same request may succeed. */
  retryable?: boolean;

  /**
   * HTTP response that caused the API error.
   */
  response?: Response;

  /**
   * Parsed JSON body, response text, or an error captured while parsing the response.
   */
  body?: unknown;

  /**
   * Original non-HTTP error captured while calling the API.
   */
  original?: unknown;
}

/**
 * Error raised by Anime Garden API client calls with optional HTTP response context.
 */
export class AnimeGardenError extends Error {
  public readonly code: ClientErrorCode;

  public readonly retryable: boolean;

  public readonly response?: Response;

  public readonly status?: number;

  public readonly statusText?: string;

  public readonly body?: unknown;

  public readonly original?: unknown;

  public constructor(message: string, options: AnimeGardenErrorOptions = {}) {
    super(message);
    this.name = 'AnimeGardenError';
    this.code = options.code ?? inferErrorCode(options.response, options.original);
    this.retryable = options.retryable ?? isRetryableCode(this.code);
    this.response = options.response;
    this.status = options.response?.status;
    this.statusText = options.response?.statusText;
    this.body = options.body;
    this.original = options.original;

    if (options.original !== undefined) {
      this.cause = options.original;
      if (options.original instanceof Error && options.original?.stack) {
        this.stack = options.original.stack;
      }
    }
  }

  /**
   * Create an API error from an HTTP response without consuming the original body.
   */
  public static async fromResponse(message: string, response: Response) {
    return new AnimeGardenError(message, {
      response,
      body: await readResponseBody(response)
    });
  }

  /**
   * Create an API error that preserves the thrown value from an operational request failure.
   */
  public static fromOriginalError(
    message: string,
    original: unknown,
    code: ClientErrorCode = 'NETWORK_ERROR'
  ) {
    return new AnimeGardenError(message, { original, code });
  }

  /** Create an error for a successful HTTP response whose body is unusable. */
  public static fromInvalidResponse(message: string, body?: unknown, response?: Response) {
    return new AnimeGardenError(message, {
      response,
      body,
      code: 'INVALID_RESPONSE',
      retryable: false
    });
  }

  /** Create an error for invalid request arguments handled by a high-level API. */
  public static fromBadRequest(message: string, body?: unknown) {
    return new AnimeGardenError(message, {
      body,
      code: 'BAD_REQUEST',
      retryable: false
    });
  }
}

export type ClientFailure = {
  ok: false;
  code: ClientErrorCode;
  error: AnimeGardenError;
};

export type ClientSuccess<T extends object> = { ok: true } & T;

export type ClientResult<T extends object> = ClientSuccess<T> | ClientFailure;

/** Converts operational request failures into the public Result failure shape. */
export function toClientFailure(error: unknown): ClientFailure {
  const normalized = normalizeOperationalError(error);
  return {
    ok: false,
    code: normalized.code,
    error: normalized
  };
}

function normalizeOperationalError(error: unknown): AnimeGardenError {
  if (error instanceof AnimeGardenError) return error;

  if (isNamedError(error, 'AbortError')) {
    return AnimeGardenError.fromOriginalError(error.message || 'Request aborted', error, 'ABORTED');
  }

  if (isNamedError(error, 'TimeoutError')) {
    return AnimeGardenError.fromOriginalError(
      error.message || 'Request timed out',
      error,
      'TIMEOUT'
    );
  }

  // Raw exceptions here originate from configuration, URL construction, or user hooks.
  throw error;
}

function inferErrorCode(response?: Response, original?: unknown): ClientErrorCode {
  if (response) {
    if (response.status === 404) return 'NOT_FOUND';
    if (response.status === 408) return 'TIMEOUT';
    if (response.status === 429) return 'RATE_LIMITED';
    if (response.status >= 500) return 'SERVER_ERROR';
    if (response.status >= 400) return 'BAD_REQUEST';
    return 'INVALID_RESPONSE';
  }

  if (isNamedError(original, 'AbortError')) return 'ABORTED';
  if (isNamedError(original, 'TimeoutError')) return 'TIMEOUT';
  return original === undefined ? 'INVALID_RESPONSE' : 'NETWORK_ERROR';
}

function isRetryableCode(code: ClientErrorCode) {
  return (
    code === 'RATE_LIMITED' ||
    code === 'SERVER_ERROR' ||
    code === 'NETWORK_ERROR' ||
    code === 'TIMEOUT'
  );
}

function isNamedError(error: unknown, name: string): error is Error {
  return error instanceof Error && error.name === name;
}

async function readResponseBody(response: Response): Promise<unknown> {
  try {
    return await response.clone().json();
  } catch {
    try {
      return await response.clone().text();
    } catch {
      return undefined;
    }
  }
}
