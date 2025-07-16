import type { Context, MiddlewareHandler } from 'hono';

export class MemoryCache implements Cache {
  private cache: Map<string, Response> = new Map();

  public async match(request: RequestInfo | URL): Promise<Response | undefined> {
    const key = this.getKey(request);
    const response = this.cache.get(key);
    return response ? response.clone() : undefined;
  }

  public async matchAll(request?: RequestInfo | URL): Promise<Response[]> {
    if (!request) {
      return Array.from(this.cache.values()).map((response) => response.clone());
    }
    const matched = await this.match(request);
    return matched ? [matched] : [];
  }

  public async add(request: RequestInfo | URL): Promise<void> {
    const requestObj = typeof request === 'string' ? new Request(request) : request;
    const response = await fetch(requestObj);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    await this.put(request, response);
  }

  public async addAll(requests: RequestInfo[]): Promise<void> {
    await Promise.all(requests.map((request) => this.add(request)));
  }

  public async put(request: RequestInfo | URL, response: Response): Promise<void> {
    const key = this.getKey(request);
    this.cache.set(key, response.clone());
  }

  public async delete(request: RequestInfo | URL): Promise<boolean> {
    const key = this.getKey(request);
    return this.cache.delete(key);
  }

  public async keys(): Promise<Request[]> {
    return Array.from(this.cache.keys()).map((url) => new Request(url));
  }

  private getKey(request: RequestInfo | URL): string {
    if (typeof request === 'string') {
      return request;
    } else if (request instanceof Request) {
      return request.url;
    } else {
      throw new Error('Invalid request type');
    }
  }
}

export class MemoryCacheStorage implements CacheStorage {
  private caches: Map<string, MemoryCache> = new Map();

  async open(cacheName: string): Promise<MemoryCache> {
    if (!this.caches.has(cacheName)) {
      this.caches.set(cacheName, new MemoryCache());
    }
    return this.caches.get(cacheName)!;
  }

  async has(cacheName: string): Promise<boolean> {
    return this.caches.has(cacheName);
  }

  async delete(cacheName: string): Promise<boolean> {
    return this.caches.delete(cacheName);
  }

  async keys(): Promise<string[]> {
    return Array.from(this.caches.keys());
  }

  async match(request: Request | string): Promise<Response | undefined> {
    for (const cache of this.caches.values()) {
      const response = await cache.match(request);
      if (response) return response;
    }
    return undefined;
  }
}

/**
 * Cache Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/cache}
 *
 * @param {Object} options - The options for the cache middleware.
 * @param {string | Function} options.cacheName - The name of the cache. Can be used to store multiple caches with different identifiers.
 * @param {boolean} [options.wait=false] - A boolean indicating if Hono should wait for the Promise of the `cache.put` function to resolve before continuing with the request. Required to be true for the Deno environment.
 * @param {string} [options.cacheControl] - A string of directives for the `Cache-Control` header.
 * @param {string | string[]} [options.vary] - Sets the `Vary` header in the response. If the original response header already contains a `Vary` header, the values are merged, removing any duplicates.
 * @param {Function} [options.keyGenerator] - Generates keys for every request in the `cacheName` store. This can be used to cache data based on request parameters or context parameters.
 * @returns {MiddlewareHandler} The middleware handler function.
 * @throws {Error} If the `vary` option includes "*".
 *
 * @example
 * ```ts
 * app.get(
 *   '*',
 *   cache({
 *     cacheName: 'my-app',
 *     cacheControl: 'max-age=3600',
 *   })
 * )
 * ```
 */
export const cache = (options: {
  cacheName: string | ((c: Context) => Promise<string> | string);
  wait?: boolean;
  cacheControl?: string;
  vary?: string | string[];
  keyGenerator?: (c: Context) => Promise<string> | string;
  caches?: CacheStorage;
}): MiddlewareHandler => {
  const caches = options.caches ?? globalThis.caches;

  if (!caches) {
    console.log('Cache Middleware is not enabled because caches is not defined.');
    return async (_c, next) => await next();
  }

  if (options.wait === undefined) {
    options.wait = false;
  }

  const cacheControlDirectives = options.cacheControl
    ?.split(',')
    .map((directive) => directive.toLowerCase());
  const varyDirectives = Array.isArray(options.vary)
    ? options.vary
    : options.vary?.split(',').map((directive) => directive.trim());
  // RFC 7231 Section 7.1.4 specifies that "*" is not allowed in Vary header.
  // See: https://datatracker.ietf.org/doc/html/rfc7231#section-7.1.4
  if (options.vary?.includes('*')) {
    throw new Error(
      'Middleware vary configuration cannot include "*", as it disallows effective caching.'
    );
  }

  const addHeader = (c: Context) => {
    if (cacheControlDirectives) {
      const existingDirectives =
        c.res.headers
          .get('Cache-Control')
          ?.split(',')
          .map((d) => d.trim().split('=', 1)[0]) ?? [];
      for (const directive of cacheControlDirectives) {
        let [name, value] = directive.trim().split('=', 2);
        name = name.toLowerCase();
        if (!existingDirectives.includes(name)) {
          c.header('Cache-Control', `${name}${value ? `=${value}` : ''}`, { append: true });
        }
      }
    }

    if (varyDirectives) {
      const existingDirectives =
        c.res.headers
          .get('Vary')
          ?.split(',')
          .map((d) => d.trim()) ?? [];

      const vary = Array.from(
        new Set(
          [...existingDirectives, ...varyDirectives].map((directive) => directive.toLowerCase())
        )
      ).sort();

      if (vary.includes('*')) {
        c.header('Vary', '*');
      } else {
        c.header('Vary', vary.join(', '));
      }
    }
  };

  return async function cache(c, next) {
    let key = c.req.url;
    if (options.keyGenerator) {
      key = await options.keyGenerator(c);
    }

    const cacheName =
      typeof options.cacheName === 'function' ? await options.cacheName(c) : options.cacheName;
    const cache = await caches.open(cacheName);
    const response = await cache.match(key);
    if (response) {
      return new Response(response.body, response);
    }

    await next();
    if (!c.res.ok) {
      return;
    }
    addHeader(c);
    const res = c.res.clone();
    if (options.wait) {
      await cache.put(key, res);
    } else {
      c.executionCtx.waitUntil(cache.put(key, res));
    }
  };
};
