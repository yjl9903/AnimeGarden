import type { MiddlewareHandler } from 'hono';

const RETAINED_304_HEADERS = [
  'cache-control',
  'content-location',
  'date',
  'etag',
  'expires',
  'vary'
] as const;

const DEFAULT_ETAG_STATUS = 200;

const DIGEST_CHUNK_SIZE = 256 * 1024;

const stripWeak = (tag: string) => tag.replace(/^W\//, '');

function etagMatches(etag: string, ifNoneMatch: string | null) {
  return (
    ifNoneMatch != null &&
    ifNoneMatch.split(/,\s*/).some((tag) => stripWeak(tag) === stripWeak(etag))
  );
}

function initializeGenerator(generator?: SafeEtagOptions['generateDigest']) {
  if (generator) {
    return generator;
  }

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return (body: ArrayBuffer | Uint8Array) =>
      crypto.subtle.digest(
        {
          name: 'SHA-1'
        },
        toDigestInput(body)
      );
  }

  return undefined;
}

function mergeBuffers(buffer1: ArrayBuffer | Uint8Array | undefined, buffer2: Uint8Array) {
  if (!buffer1) {
    return buffer2;
  }

  const left = buffer1 instanceof Uint8Array ? buffer1 : new Uint8Array(buffer1);
  const merged = new Uint8Array(new ArrayBuffer(left.byteLength + buffer2.byteLength));
  merged.set(left, 0);
  merged.set(buffer2, left.byteLength);

  return merged;
}

function toDigestInput(body: ArrayBuffer | Uint8Array) {
  if (body instanceof Uint8Array) {
    return new Uint8Array(body).buffer;
  }

  return body;
}

/**
 * Match Hono 4.13.14's fixed-size digest blocks, regardless of stream chunk boundaries.
 * Upstream: https://github.com/honojs/hono/blob/v4.13.14/src/middleware/etag/digest.ts
 */
async function generateHexDigest(
  stream: ReadableStream<Uint8Array> | null,
  generator: NonNullable<SafeEtagOptions['generateDigest']>
) {
  if (!stream) {
    return null;
  }

  let result: ArrayBuffer | Uint8Array | undefined;
  let chunk: Uint8Array | undefined;
  let chunkLength = 0;
  const digest = async (body: Uint8Array) => {
    result = await generator(mergeBuffers(result, body));
  };
  const reader = stream.getReader();

  for (;;) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    let offset = 0;
    while (offset < value.byteLength) {
      const remaining = value.byteLength - offset;

      // Hash complete blocks directly without copying them into the partial buffer.
      if (chunkLength === 0 && remaining >= DIGEST_CHUNK_SIZE) {
        await digest(value.subarray(offset, offset + DIGEST_CHUNK_SIZE));
        offset += DIGEST_CHUNK_SIZE;
        continue;
      }

      const requiredLength = chunkLength + remaining;
      if (requiredLength < DIGEST_CHUNK_SIZE) {
        if (!chunk) {
          chunk = value.slice(offset);
        } else {
          // Grow geometrically so small incoming chunks do not cause repeated full copies.
          if (chunk.byteLength < requiredLength) {
            const nextChunk = new Uint8Array(
              new ArrayBuffer(
                Math.min(DIGEST_CHUNK_SIZE, Math.max(requiredLength, chunk.byteLength * 2))
              )
            );
            nextChunk.set(chunk.subarray(0, chunkLength));
            chunk = nextChunk;
          }
          chunk.set(value.subarray(offset), chunkLength);
        }
        chunkLength = requiredLength;
        break;
      }

      // Complete a block assembled from multiple stream reads, preserving its remainder.
      const length = DIGEST_CHUNK_SIZE - chunkLength;
      if (chunk?.byteLength !== DIGEST_CHUNK_SIZE) {
        const nextChunk = new Uint8Array(new ArrayBuffer(DIGEST_CHUNK_SIZE));
        if (chunk) nextChunk.set(chunk.subarray(0, chunkLength));
        chunk = nextChunk;
      }
      chunk.set(value.subarray(offset, offset + length), chunkLength);
      await digest(chunk);
      chunkLength = 0;
      offset += length;
    }
  }

  if (chunk && chunkLength > 0) {
    await digest(chunk.subarray(0, chunkLength));
  }

  if (!result) {
    return null;
  }

  const bytes = result instanceof Uint8Array ? result : new Uint8Array(result);
  return Array.prototype.map.call(bytes, (x: number) => x.toString(16).padStart(2, '0')).join('');
}

function isConsumedBodyError(error: unknown) {
  return (
    error instanceof TypeError &&
    /(body (has already been consumed|is unusable)|already been read|already been consumed)/i.test(
      error.message
    )
  );
}

export interface SafeEtagOptions {
  /** Headers copied from the original response when returning 304. */
  retainedHeaders?: string[];

  /** Generates weak validators when true; strong validators are the default. */
  weak?: boolean;

  /** Overrides the default SHA-1 digest generator for tests and runtimes. */
  generateDigest?: (body: ArrayBuffer | Uint8Array) => Promise<ArrayBuffer>;
}

/**
 * Applies guarded ETag generation and conditional request handling to a Fetch response.
 */
export async function safeEtagResponse(
  request: Request,
  response: Response,
  options?: SafeEtagOptions
) {
  const retainedHeaders = options?.retainedHeaders ?? [...RETAINED_304_HEADERS];
  const weak = options?.weak ?? false;
  const generator = initializeGenerator(options?.generateDigest);
  const ifNoneMatch = request.headers.get('If-None-Match');

  if (response.status !== DEFAULT_ETAG_STATUS) {
    return response;
  }

  let etag = response.headers.get('ETag');
  let generatedEtag = false;
  if (!etag) {
    if (!generator || response.bodyUsed) {
      return response;
    }

    try {
      const hash = await generateHexDigest(response.clone().body, generator);
      if (hash === null) {
        return response;
      }

      etag = weak ? `W/"${hash}"` : `"${hash}"`;
      generatedEtag = true;
    } catch (error) {
      // Treat consumed bodies as a cache miss instead of failing the request.
      if (isConsumedBodyError(error)) {
        return response;
      }

      throw error;
    }
  }

  if (etagMatches(etag, ifNoneMatch)) {
    const headers = new Headers();
    response.headers.forEach((value, key) => {
      if (retainedHeaders.includes(key.toLowerCase())) {
        headers.append(key, value);
      }
    });
    headers.set('ETag', etag);

    return new Response(null, {
      status: 304,
      statusText: 'Not Modified',
      headers
    });
  }

  if (!generatedEtag) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set('ETag', etag);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

// Hono's built-in etag middleware clones the response body to hash it.
// If some handler already consumed that body, clone() throws and turns the
// request into a 500. This wrapper preserves normal etag behavior but skips
// hashing for already-consumed responses.
export function safeEtag(options?: SafeEtagOptions): MiddlewareHandler {
  return async function safeEtagMiddleware(c, next) {
    await next();
    const response = await safeEtagResponse(c.req.raw, c.res, options);
    if (response !== c.res) {
      c.res = response;
    }
  };
}
