import type { MiddlewareHandler } from 'hono';

const RETAINED_304_HEADERS = [
  'cache-control',
  'content-location',
  'date',
  'etag',
  'expires',
  'vary'
] as const;

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

async function generateHexDigest(
  stream: ReadableStream<Uint8Array> | null,
  generator: NonNullable<SafeEtagOptions['generateDigest']>
) {
  if (!stream) {
    return null;
  }

  let result: ArrayBuffer | Uint8Array | undefined;
  const reader = stream.getReader();

  for (;;) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    if (value) {
      result = await generator(mergeBuffers(result, value));
    }
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
  retainedHeaders?: string[];

  weak?: boolean;

  generateDigest?: (body: ArrayBuffer | Uint8Array) => Promise<ArrayBuffer>;
}

// Keep the sitemap node app on the same guarded etag behavior as the API
// server so consumed response bodies do not surface as 500s.
export function safeEtag(options?: SafeEtagOptions): MiddlewareHandler {
  const retainedHeaders = options?.retainedHeaders ?? [...RETAINED_304_HEADERS];
  const weak = options?.weak ?? false;
  const generator = initializeGenerator(options?.generateDigest);

  return async function safeEtagMiddleware(c, next) {
    const ifNoneMatch = c.req.header('If-None-Match') ?? null;

    await next();

    const res = c.res;
    let etag = res.headers.get('ETag');
    if (!etag) {
      if (!generator || res.bodyUsed) {
        return;
      }

      try {
        const hash = await generateHexDigest(res.clone().body, generator);
        if (hash === null) {
          return;
        }

        etag = weak ? `W/"${hash}"` : `"${hash}"`;
      } catch (error) {
        if (isConsumedBodyError(error)) {
          return;
        }

        throw error;
      }
    }

    if (etagMatches(etag, ifNoneMatch)) {
      c.res = new Response(null, {
        status: 304,
        statusText: 'Not Modified',
        headers: {
          ETag: etag
        }
      });

      c.res.headers.forEach((_, key) => {
        if (!retainedHeaders.includes(key.toLowerCase())) {
          c.res.headers.delete(key);
        }
      });
    } else {
      c.res.headers.set('ETag', etag);
    }
  };
}
