import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchAPI } from '@animegarden/client';

import {
  handleSitemapHeadRequest,
  handleSitemapIndexHeadRequest,
  handleSitemapIndexRequest,
  handleSitemapRequest
} from '../src/sitemap/index.server';

vi.mock('@animegarden/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@animegarden/client')>();

  return {
    ...actual,
    fetchAPI: vi.fn(async (path: string) => {
      if (path === 'teams') {
        return { teams: [{ name: 'TestTeam' }] };
      }

      if (path === 'sitemaps/subjects') {
        return { subjects: [{ id: 1234 }] };
      }

      if (path === 'sitemaps/2020/1') {
        return { resources: [{ provider: 'dmhy', providerId: 'abc-1' }] };
      }

      throw new Error(`Unexpected sitemap fetch: ${path}`);
    })
  };
});

const request = (pathname: string) => new Request(`https://animes.garden${pathname}`);

describe('sitemap server routes', () => {
  beforeEach(() => {
    vi.mocked(fetchAPI).mockClear();
  });

  it('serves the sitemap index', async () => {
    const response = await handleSitemapIndexRequest(request('/sitemap-index.xml'));
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/xml');
    expect(xml).toContain('<loc>https://animes.garden/sitemap-0.xml</loc>');
    expect(xml).toContain('<loc>https://animes.garden/sitemap-fansubs.xml</loc>');
    expect(xml).toContain('<loc>https://animes.garden/sitemap-subjects.xml</loc>');
    expect(xml).toContain('<loc>https://animes.garden/sitemap-2020-01.xml</loc>');
  });

  it('serves sitemap HEAD requests with ETag validators', async () => {
    const indexHead = await handleSitemapIndexHeadRequest(request('/sitemap-index.xml'));
    const indexEtag = indexHead.headers.get('etag');
    const staticHead = await handleSitemapHeadRequest(request('/sitemap-0.xml'));

    expect(indexHead.status).toBe(200);
    expect(indexHead.headers.get('content-type')).toContain('application/xml');
    expect(indexEtag).toMatch(/^"[0-9a-f]+"$/);
    expect(await indexHead.text()).toBe('');
    expect(staticHead.headers.get('etag')).toMatch(/^"[0-9a-f]+"$/);

    const notModified = await handleSitemapIndexHeadRequest(
      new Request('https://animes.garden/sitemap-index.xml', {
        method: 'HEAD',
        headers: {
          'If-None-Match': indexEtag!
        }
      })
    );

    expect(notModified.status).toBe(304);
    expect(notModified.headers.get('etag')).toBe(indexEtag);
    expect(await notModified.text()).toBe('');
  });

  it('serves the static sitemap', async () => {
    const response = await handleSitemapRequest(request('/sitemap-0.xml'));
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(xml).toContain('<loc>https://animes.garden/</loc>');
    expect(xml).toContain('<loc>https://animes.garden/anime</loc>');
    expect(xml).toContain('<loc>https://animes.garden/docs/api</loc>');
  });

  it('maps upstream teams, subjects, and monthly details', async () => {
    const fansubs = await (await handleSitemapRequest(request('/sitemap-fansubs.xml'))).text();
    const subjects = await (await handleSitemapRequest(request('/sitemap-subjects.xml'))).text();
    const monthly = await (await handleSitemapRequest(request('/sitemap-2020-01.xml'))).text();

    expect(fansubs).toContain('<loc>https://animes.garden/resources/1?fansub=TestTeam</loc>');
    expect(subjects).toContain('<loc>https://animes.garden/subject/1234</loc>');
    expect(monthly).toContain('<loc>https://animes.garden/detail/dmhy/abc-1</loc>');
    expect(fetchAPI).toHaveBeenCalledWith(
      'teams',
      undefined,
      expect.objectContaining({ baseURL: 'https://api.animes.garden/', retry: 5 })
    );
    expect(fetchAPI).toHaveBeenCalledWith(
      'sitemaps/subjects',
      undefined,
      expect.objectContaining({ baseURL: 'https://api.animes.garden/', retry: 5 })
    );
    expect(fetchAPI).toHaveBeenCalledWith(
      'sitemaps/2020/1',
      undefined,
      expect.objectContaining({ baseURL: 'https://api.animes.garden/', retry: 5 })
    );
  });

  it('returns 404 for unknown sitemap names', async () => {
    const response = await handleSitemapRequest(request('/sitemap-nope.xml'));

    expect(response.status).toBe(404);
    expect(fetchAPI).not.toHaveBeenCalled();
  });
});
