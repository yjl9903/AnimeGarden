import { describe, expect, it } from 'vitest';
import {
  createServerEntry,
  getResponseHeaders,
  getResponseStatus
} from '@tanstack/react-start/server';

import {
  appendLinkHeader,
  ResponseCacheControl,
  setCacheControl,
  setErrorResponse,
  setResponseStatus
} from '../src/utils/response';

/** Runs response helpers inside a real Start request scope and captures their state. */
async function runInRequest(handler: () => Promise<void>) {
  const entry = createServerEntry({
    async fetch() {
      await handler();
      return new Response(null, {
        status: getResponseStatus(),
        headers: Array.from(getResponseHeaders().entries())
      });
    }
  });
  return entry.fetch(new Request('https://animes.garden/test'));
}

describe('server response helpers', () => {
  it('sets cache headers and preserves multiple discovery links', async () => {
    const response = await runInRequest(async () => {
      await setCacheControl(ResponseCacheControl.List);
      await appendLinkHeader('</openapi.json>; rel="service-desc"');
      await appendLinkHeader('</sitemap-index.xml>; rel="sitemap"');
    });

    expect(response.headers.get('cache-control')).toBe(ResponseCacheControl.List);
    expect(response.headers.get('link')).toBe(
      '</openapi.json>; rel="service-desc", </sitemap-index.xml>; rel="sitemap"'
    );
  });

  it('makes upstream failures non-cacheable and sets their status', async () => {
    const response = await runInRequest(async () => {
      await setCacheControl(ResponseCacheControl.Detail);
      await setErrorResponse();
    });

    expect(response.status).toBe(502);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('keeps response state isolated across requests', async () => {
    const [missing, failed, normal] = await Promise.all([
      runInRequest(() => setResponseStatus(404)),
      runInRequest(() => setErrorResponse(503)),
      runInRequest(() => setCacheControl(ResponseCacheControl.Docs))
    ]);

    expect(missing.status).toBe(404);
    expect(missing.headers.get('cache-control')).toBeNull();
    expect(failed.status).toBe(503);
    expect(failed.headers.get('cache-control')).toBe('no-store');
    expect(normal.status).toBe(200);
    expect(normal.headers.get('cache-control')).toBe(ResponseCacheControl.Docs);
  });
});
