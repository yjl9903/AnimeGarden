import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { safeEtag } from '../src/server/utils/etag';

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
