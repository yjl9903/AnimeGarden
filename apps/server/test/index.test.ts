import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { safeEtag, safeEtagResponse } from '../src/server/utils/etag';

describe('safeEtag', () => {
  it('returns 304 when If-None-Match matches', async () => {
    const app = new Hono();
    app.get('/hello', safeEtag(), () => {
      return new Response('hello', {
        headers: {
          'content-type': 'text/plain; charset=UTF-8'
        }
      });
    });

    const first = await app.request('http://localhost/hello');
    expect(first.status).toBe(200);
    expect(await first.text()).toBe('hello');

    const etag = first.headers.get('etag');
    expect(etag).toBeTruthy();

    const second = await app.request(
      new Request('http://localhost/hello', {
        headers: {
          'If-None-Match': etag!
        }
      })
    );

    expect(second.status).toBe(304);
    expect(second.headers.get('etag')).toBe(etag);
  });

  it('preserves cache headers on 304 responses', async () => {
    const app = new Hono();
    app.get('/cached', safeEtag(), () => {
      return new Response('hello', {
        headers: {
          'cache-control': 'public, max-age=60',
          'content-type': 'text/plain; charset=UTF-8',
          vary: 'Accept'
        }
      });
    });

    const first = await app.request('http://localhost/cached');
    const etag = first.headers.get('etag');

    const second = await app.request(
      new Request('http://localhost/cached', {
        headers: {
          'If-None-Match': etag!
        }
      })
    );

    expect(second.status).toBe(304);
    expect(second.headers.get('etag')).toBe(etag);
    expect(second.headers.get('cache-control')).toBe('public, max-age=60');
    expect(second.headers.get('vary')).toBe('Accept');
    expect(second.headers.get('content-type')).toBeNull();
  });

  it('skips non-200 fetch responses', async () => {
    const response = await safeEtagResponse(
      new Request('http://localhost/missing'),
      new Response('missing', { status: 404 })
    );

    expect(response.status).toBe(404);
    expect(response.headers.get('etag')).toBeNull();
    expect(await response.text()).toBe('missing');
  });

  it('skips etag generation when the response body was already consumed', async () => {
    const app = new Hono();
    app.get('/consumed', safeEtag(), async () => {
      // Simulate the broken runtime shape behind the production error:
      // the handler returns a Response whose body was already read once.
      const response = new Response('hello', {
        headers: {
          'content-type': 'text/plain; charset=UTF-8'
        }
      });

      await response.text();
      return response;
    });

    const response = await app.request('http://localhost/consumed');

    expect(response.status).toBe(200);
    expect(response.headers.get('etag')).toBeNull();
    await expect(response.text()).rejects.toThrow(
      /(unusable|already been read|already been consumed)/i
    );
  });
});
