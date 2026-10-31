import { Hono } from 'hono';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedModule } from '../src/feed';
import { ResourcesSlowQueryBusyError, ResourcesSlowQueryTimeoutError } from '../src/error';
import { defineFeedRoutes } from '../src/server/routes/feed';
import { defineResourcesRoutes } from '../src/server/routes/resources';
import type { AppEnv } from '../src/server/utils/hono';
import {
  getResourcesQueryErrorResponse,
  getResourcesQueryErrorXml
} from '../src/server/utils/resources-query';

afterEach(() => vi.useRealTimers());

function bindSlowQueryErrorHandler(app: Hono<AppEnv>) {
  app.onError((error, c) => {
    const queryError = getResourcesQueryErrorResponse(error);
    if (queryError) {
      if (c.req.path.endsWith('/feed.xml')) {
        c.res.headers.set('Content-Type', 'application/xml; charset=UTF-8');
        c.res.headers.set('Cache-Control', 'no-store');
        return c.body(getResourcesQueryErrorXml(queryError.message), queryError.status);
      }

      return c.json(
        {
          status: 'ERROR',
          message: queryError.message
        },
        queryError.status
      );
    }

    return c.json({ status: 'ERROR' }, 500);
  });
}

function createSystem(error: Error) {
  return {
    options: {
      site: 'animes.garden'
    },
    modules: {
      resources: {
        query: {
          find: vi.fn().mockRejectedValue(error)
        }
      },
      collections: {
        getCollection: vi.fn()
      }
    }
  } as any;
}

function createFeedApp(error: Error) {
  const app = new Hono<AppEnv>();
  const sys = createSystem(error);

  sys.modules.feed = new FeedModule(sys, FeedModule.name);
  defineFeedRoutes(sys, app);
  bindSlowQueryErrorHandler(app);

  return app;
}

function createResourcesApp(error: Error) {
  const app = new Hono<AppEnv>();
  const sys = createSystem(error);

  defineResourcesRoutes(sys, app);
  bindSlowQueryErrorHandler(app);

  return app;
}

function createResourcesAppWithFind(find: ReturnType<typeof vi.fn>) {
  const app = new Hono<AppEnv>();
  const sys = {
    modules: {
      resources: {
        query: {
          find
        }
      }
    }
  } as any;

  defineResourcesRoutes(sys, app);
  bindSlowQueryErrorHandler(app);

  return app;
}

function createResource(sizeInBytes: number) {
  return {
    provider: 'dmhy',
    providerId: '12345',
    title: 'Test resource',
    magnet: 'magnet:?xt=urn:btih:test',
    tracker: '',
    size: sizeInBytes,
    createdAt: new Date('2026-08-19T00:00:00Z')
  };
}

function createSuccessfulFeedApp(sizeInBytes: number, subjectId?: number | null, tracker = '') {
  const app = new Hono<AppEnv>();
  const resource = { ...createResource(sizeInBytes), subjectId, tracker };
  const sys = {
    options: {
      site: 'animes.garden'
    },
    modules: {
      resources: {
        query: {
          find: vi.fn().mockResolvedValue({ resources: [resource] })
        }
      },
      collections: {
        getCollection: vi.fn().mockResolvedValue({
          name: 'Test collection',
          results: [{ resources: [resource] }]
        })
      }
    }
  } as any;

  sys.modules.feed = new FeedModule(sys, FeedModule.name);
  defineFeedRoutes(sys, app);

  return app;
}

describe.each(['/feed.xml', '/collection/test/feed.xml'])('feed tracker parameter: %s', (path) => {
  it.each([
    ['', true],
    ['?tracker=true', true],
    ['?tracker=false', false],
    ['?tracker=off', false],
    ['?tracker=no', false],
    ['?TRACKER=FALSE', false]
  ])('controls enclosure trackers with query %s', async (query, enabled) => {
    const tracker = '&tr=https%3A%2F%2Ftracker.example.com%2Fannounce';
    const app = createSuccessfulFeedApp(1572864, undefined, tracker);

    const response = await app.request(`http://localhost${path}${query}`);

    expect(response.status).toBe(200);
    const { rss } = new XMLParser({ ignoreAttributes: false }).parse(await response.text());
    expect(rss.channel.item.enclosure['@_url']).toBe(
      'magnet:?xt=urn:btih:test' + (enabled ? tracker : '')
    );
  });
});

describe('canonical resources feed cache', () => {
  function setup() {
    const query = {
      find: vi.fn().mockResolvedValue({ resources: [createResource(1024)] })
    };
    const subjects = { getSubjectMetadata: vi.fn().mockResolvedValue(undefined) };
    const app = new Hono<AppEnv>();
    const sys = { options: {}, modules: { resources: { query }, subjects } } as any;
    sys.modules.feed = new FeedModule(sys, FeedModule.name);
    defineFeedRoutes(sys, app);
    bindSlowQueryErrorHandler(app);
    return { app, query, subjects, sys };
  }

  it('shares one query, XML and ETag across equivalent URLs', async () => {
    const { app, query, subjects } = setup();
    const canonical = '/feed.xml?publisher=A&publisher=B&subject=1&subject=2';
    const first = await app.request(canonical);
    const xml = await first.text();
    const etag = first.headers.get('etag')!;
    const equivalent =
      '/feed.xml?Subject=2&subject=1&subject=2&publisher=B&Publisher=A&publisher=A&page=1&PAGESIZE=100&tracker=true&unused=yes';
    const second = await app.request(equivalent);
    expect(await second.text()).toBe(xml);
    expect(second.headers.get('etag')).toBe(etag);
    const conditional = await app.request(equivalent, { headers: { 'If-None-Match': etag } });
    expect(conditional.status).toBe(304);
    expect(query.find).toHaveBeenCalledTimes(1);
    expect(subjects.getSubjectMetadata).toHaveBeenCalledTimes(2);
    expect(query.find).toHaveBeenCalledWith(
      { subjects: [1, 2], publishers: ['A', 'B'] },
      { page: 1, pageSize: 100 }
    );
    const { rss } = new XMLParser().parse(xml);
    expect(rss.channel.link).toBe(
      'https://animes.garden/resources/1?publisher=A&publisher=B&subject=1&subject=2'
    );
  });

  it('shares the module cache across routers bound to the same system', async () => {
    const { app, query, sys } = setup();
    const other = new Hono<AppEnv>();
    defineFeedRoutes(sys, other);
    const first = await app.request('/feed.xml');
    const second = await other.request('/feed.xml', {
      headers: { 'If-None-Match': first.headers.get('etag')! }
    });
    expect(second.status).toBe(304);
    expect(query.find).toHaveBeenCalledTimes(1);
  });

  it('lets callers use the module with domain options and receive plain content', async () => {
    const { sys, query } = setup();
    const feed: FeedModule = sys.modules.feed;
    const options = {
      filter: { subjects: [2, 1, 2] },
      pagination: { page: 1, pageSize: 100 },
      tracker: false
    };
    const result = await feed.getResourcesFeed(options);
    expect(result).toMatchObject({
      xml: expect.any(String),
      digest: expect.any(String),
      stable: true
    });
    expect(query.find).toHaveBeenCalledWith({ subjects: [1, 2] }, options.pagination);
    expect(options.filter.subjects).toEqual([2, 1, 2]);
  });

  it('handles ETag lists, weak tags and wildcard in the controller without querying again', async () => {
    const { app, query } = setup();
    const first = await app.request('/feed.xml');
    const tag = first.headers.get('etag')!;
    for (const value of [tag, `"other", W/${tag}`, '*']) {
      const response = await app.request('/feed.xml', { headers: { 'If-None-Match': value } });
      expect(response.status).toBe(304);
      expect(await response.text()).toBe('');
      expect(response.headers.get('etag')).toBe(tag);
      expect(response.headers.get('last-modified')).toBe(first.headers.get('last-modified'));
      expect(response.headers.get('cache-control')).toBe(
        'public, max-age=3600, s-maxage=3600, stale-while-revalidate=60'
      );
      expect(response.headers.get('content-type')).toBeNull();
    }
    expect(query.find).toHaveBeenCalledTimes(1);
  });

  it('handles date validators and ETag precedence in the controller', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-01T00:00:10Z'));
    const { app, query, sys } = setup();
    vi.advanceTimersByTime(1000);
    const first = await app.request('/feed.xml');
    const date = first.headers.get('last-modified')!;
    expect(
      (await app.request('/feed.xml', { headers: { 'If-Modified-Since': date } })).status
    ).toBe(304);
    expect(
      (await app.request('/feed.xml', { headers: { 'If-Modified-Since': 'invalid' } })).status
    ).toBe(200);
    expect(
      (
        await app.request('/feed.xml', {
          headers: { 'If-Modified-Since': date, 'If-None-Match': '"other"' }
        })
      ).status
    ).toBe(200);
    expect(query.find).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    await sys.modules.feed.refresh();
    query.find.mockResolvedValue({ resources: [] });
    expect(
      (await app.request('/feed.xml', { headers: { 'If-Modified-Since': date } })).status
    ).toBe(200);
  });

  it('serves a render detached by refresh as no-store without conditional validators', async () => {
    const { app, query, sys } = setup();
    const first = await app.request('/feed.xml');
    await sys.modules.feed.refresh();
    let started!: () => void;
    const rendering = new Promise<void>((resolve) => {
      started = resolve;
    });
    let finish!: (value: { resources: ReturnType<typeof createResource>[] }) => void;
    query.find.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
          started();
        })
    );
    const pending = app.request('/feed.xml', {
      headers: { 'If-None-Match': first.headers.get('etag')! }
    });
    await rendering;
    await sys.modules.feed.refresh();
    finish({ resources: [createResource(1024)] });
    const response = await pending;
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('etag')).toBeNull();
    expect(response.headers.get('last-modified')).toBeNull();
  });

  it('keeps meaningful filters and tracker choices in separate cache entries', async () => {
    const { app, query } = setup();
    const urls = [
      '/feed.xml?provider=dmhy',
      '/feed.xml?provider=dmhy&duplicate=false',
      '/feed.xml?provider=dmhy&tracker=false',
      '/feed.xml?provider=dmhy&page=2',
      '/feed.xml?provider=dmhy&pageSize=10'
    ];
    const responses = await Promise.all(urls.map((url) => app.request(url)));
    expect(new Set(responses.map((response) => response.headers.get('etag'))).size).toBe(5);
    expect(query.find).toHaveBeenCalledTimes(5);
    expect(query.find).toHaveBeenCalledWith(
      { provider: 'dmhy', duplicate: false },
      { page: 1, pageSize: 100 }
    );
    await app.request('/feed.xml?provider=dmhy&duplicate=true');
    await app.request('/feed.xml?provider=dmhy&duplicate=FALSE');
    expect(query.find).toHaveBeenCalledTimes(5);
  });

  it('regenerates binding changes and deletions after the feed module refreshes', async () => {
    const { app, query, sys } = setup();
    const first = await app.request('/feed.xml');
    await sys.modules.feed.refresh();
    query.find.mockResolvedValue({ resources: [{ ...createResource(1024), subjectId: 42 }] });
    const rebound = await app.request('/feed.xml', {
      headers: { 'If-None-Match': first.headers.get('etag')! }
    });
    expect(rebound.status).toBe(200);
    expect(await rebound.text()).toContain('<animegarden:subjectId>42</animegarden:subjectId>');
    await sys.modules.feed.refresh();
    query.find.mockResolvedValue({ resources: [] });
    const deleted = await app.request('/feed.xml', {
      headers: { 'If-None-Match': rebound.headers.get('etag')! }
    });
    expect(deleted.status).toBe(200);
    expect(await deleted.text()).not.toContain('<item>');
    expect(query.find).toHaveBeenCalledTimes(3);
  });

  it('rejects deep pagination before querying or caching a result', async () => {
    const { app, query } = setup();
    expect((await app.request('/feed.xml?page=101&pageSize=100')).status).toBe(400);
    expect(query.find).not.toHaveBeenCalled();
  });
});

describe('feed enclosure length', () => {
  it('emits the byte size returned by the query layer for the resources feed', async () => {
    const app = createSuccessfulFeedApp(1572864);

    const response = await app.request('http://localhost/feed.xml');

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain('length="1572864"');
  });

  it('emits the byte size returned by the query layer for the collection feed', async () => {
    const app = createSuccessfulFeedApp(1572864);

    const response = await app.request('http://localhost/collection/test/feed.xml');

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain('length="1572864"');
  });
});

describe.each(['/feed.xml', '/collection/test/feed.xml'])('feed Subject extension: %s', (path) => {
  it('emits the Bangumi Subject ID with its namespace and preserves standard fields', async () => {
    const app = createSuccessfulFeedApp(1572864, 123456);

    const response = await app.request(`http://localhost${path}`);
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(XMLValidator.validate(xml)).toBe(true);
    const { rss } = new XMLParser({ ignoreAttributes: false }).parse(xml);
    expect(rss['@_xmlns:animegarden']).toBe('https://animes.garden/ns/rss/1.0');
    expect(rss.channel.item).toMatchObject({
      'animegarden:subjectId': 123456,
      title: 'Test resource',
      link: 'https://animes.garden/detail/dmhy/12345',
      guid: {
        '#text': 'https://animes.garden/detail/dmhy/12345',
        '@_isPermaLink': 'true'
      },
      enclosure: {
        '@_url': 'magnet:?xt=urn:btih:test',
        '@_length': '1572864',
        '@_type': 'application/x-bittorrent'
      }
    });
  });

  it.each([null, undefined])(
    'omits the Subject element when subjectId is %s',
    async (subjectId) => {
      const app = createSuccessfulFeedApp(1572864, subjectId);

      const response = await app.request(`http://localhost${path}`);
      const xml = await response.text();

      expect(response.status).toBe(200);
      expect(XMLValidator.validate(xml)).toBe(true);
      const { rss } = new XMLParser({ ignoreAttributes: false }).parse(xml);
      expect(rss['@_xmlns:animegarden']).toBe('https://animes.garden/ns/rss/1.0');
      expect(rss.channel.item).not.toHaveProperty('animegarden:subjectId');
    }
  );
});

describe('server slow query errors', () => {
  it('returns XML 503 when the slow query lane is busy', async () => {
    const app = createFeedApp(new ResourcesSlowQueryBusyError());

    const response = await app.request('http://localhost/feed.xml');

    expect(response.status).toBe(503);
    expect(response.headers.get('content-type')).toContain('application/xml');
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.text()).resolves.toContain('<error>');
  });

  it('returns XML 504 when the slow query lane also times out', async () => {
    const app = createFeedApp(new ResourcesSlowQueryTimeoutError());

    const response = await app.request('http://localhost/feed.xml');

    expect(response.status).toBe(504);
    expect(response.headers.get('content-type')).toContain('application/xml');
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.text()).resolves.toContain('<error>');
  });

  it('returns JSON 503 for /resources from the top-level error handler', async () => {
    const app = createResourcesApp(new ResourcesSlowQueryBusyError());

    const response = await app.request('http://localhost/resources');

    expect(response.status).toBe(503);
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toMatchObject({
      status: 'ERROR',
      message: 'Resources slow database query is busy. Please retry later.'
    });
  });

  it('rejects deep /resources pagination before querying', async () => {
    const find = vi.fn();
    const app = createResourcesAppWithFind(find);

    const response = await app.request('http://localhost/resources?page=101&pageSize=100');

    expect(response.status).toBe(400);
    expect(find).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      status: 'ERROR',
      message: 'Resources pagination is too deep. Please keep offset + limit <= 10000.'
    });
  });
});
