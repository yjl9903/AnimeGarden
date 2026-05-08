export interface AnimeGardenErrorOptions {
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
  public readonly response?: Response;

  public readonly status?: number;

  public readonly statusText?: string;

  public readonly body?: unknown;

  public readonly original?: unknown;

  public constructor(message: string, options: AnimeGardenErrorOptions = {}) {
    super(message);
    this.name = 'AnimeGardenError';
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
   * Create an API error that preserves the thrown value from fetch or response parsing.
   */
  public static fromOriginalError(message: string, original: unknown) {
    return new AnimeGardenError(message, { original });
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  try {
    return await response.clone().json();
  } catch (jsonError) {
    try {
      return await response.clone().text();
    } catch {
      return undefined;
    }
  }
}
