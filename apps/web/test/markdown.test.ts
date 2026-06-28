import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleMarkdownRequest } from '../src/markdown/index.server';

const resource = {
  id: 1,
  provider: 'dmhy',
  providerId: '123',
  title: 'Test [Anime] *01*',
  href: 'https://example.com/resource',
  type: '动画',
  magnet: 'magnet:?xt=urn:btih:test',
  tracker: 'udp://tracker.example.com',
  size: 1024 * 1024,
  fansub: { id: 1, name: 'Test/Sub' },
  publisher: { id: 2, name: 'Publisher' },
  subjectId: 100,
  createdAt: new Date('2026-01-02T03:04:05Z'),
  fetchedAt: new Date('2026-01-02T03:04:05Z'),
  metadata: {}
};

vi.mock('@animegarden/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@animegarden/client')>();

  return {
    ...actual,
    fetchResources: vi.fn(async () => ({
      ok: true,
      resources: [resource],
      pagination: { page: 1, pageSize: 30, complete: false },
      filter: { types: ['动画'] },
      timestamp: new Date('2026-01-02T03:04:05Z')
    })),
    fetchResourceDetail: vi.fn(async () => ({
      ok: true,
      resource,
      detail: {
        description: '<p>Hello <strong>markdown</strong></p>',
        files: [{ name: 'Episode 01.mkv', size: '1.00 MB' }],
        magnets: [{ name: 'Main magnet', url: resource.magnet }],
        hasMoreFiles: false
      },
      timestamp: new Date('2026-01-02T03:04:05Z')
    })),
    fetchCollection: vi.fn(async () => ({
      ok: true,
      hash: 'abc',
      name: 'My Collection',
      filters: [{ name: 'Latest', searchParams: '', types: ['动画'] }],
      results: [{ resources: [resource], complete: true, filter: { types: ['动画'] } }],
      createdAt: '2026-01-02T03:04:05Z',
      timestamp: new Date('2026-01-02T03:04:05Z')
    }))
  };
});

vi.mock('../src/query/subject.server', () => ({
  getSubjectById: vi.fn(async () => ({
    id: 100,
    title: 'Subject Title',
    summary: 'Subject summary',
    poster: 'https://example.com/poster.jpg',
    search: { include: ['Subject Title'] }
  })),
  resolveSubjectsByName: vi.fn(async () => []),
  getCalendar: vi.fn(async () => [
    [
      {
        id: 100,
        title: 'Subject Title',
        platform: 'TV',
        onair_date: '2026-01-01',
        rating: { score: 7.5, rank: 1 },
        poster: 'https://example.com/poster.jpg',
        tags: [],
        search: { include: ['Subject Title'] }
      }
    ],
    [
      {
        id: 101,
        title: 'Another Title',
        platform: 'TV',
        onair_date: '2026-01-02',
        rating: { score: 7.4, rank: 2 },
        poster: 'https://example.com/another.jpg',
        tags: [],
        search: { include: ['Another Title'] }
      }
    ],
    [],
    [],
    [],
    [],
    []
  ])
}));

vi.mock('@animegarden/scraper', () => ({
  normalizeDescription: vi.fn(() => ({
    html: '<p>Hello <strong>markdown</strong></p>',
    plain: 'Hello markdown',
    summary: 'Hello markdown',
    images: []
  }))
}));

describe('markdown responses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns markdown with negotiation headers for the home page', async () => {
    const response = await handleMarkdownRequest(
      new Request('https://animes.garden/', { headers: { Accept: 'text/markdown' } })
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/markdown');
    expect(response.headers.get('vary')).toBe('Accept');
    expect(response.headers.get('x-markdown-tokens')).toMatch(/^\d+$/);
    expect(body).toContain('title: "Anime Garden 動漫花園資源網镜像站 动漫花园动画 BT 资源聚合站"');
    expect(body).toContain(
      'description: "Anime Garden 動漫花園資源網镜像站, 动漫花园动画 BT 资源聚合站"'
    );
    expect(body).toContain('# Anime Garden');
    expect(body).toContain('RSS 订阅：https://api.animes.garden/feed.xml');
    expect(body).toContain('Test \\[Anime\\] \\*01\\*');
  });

  it('returns useful detail markdown with escaped text and links', async () => {
    const response = await handleMarkdownRequest(
      new Request('https://animes.garden/detail/dmhy/123', {
        headers: { Accept: 'text/markdown' }
      })
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=86400');
    expect(body).toContain('description: "Test [Anime] *01*: Hello markdown"');
    expect(body).toContain('# Test \\[Anime\\] \\*01\\*');
    expect(body).toContain('magnet:?xt=urn:btih:test');
    expect(body).toContain('Episode 01\\.mkv');
  });

  it('uses route head metadata for resource-like markdown pages', async () => {
    const [resources, subject, collection] = await Promise.all([
      handleMarkdownRequest(
        new Request('https://animes.garden/resources/1?type=%E5%8A%A8%E7%94%BB', {
          headers: { Accept: 'text/markdown' }
        })
      ).then((response) => response.text()),
      handleMarkdownRequest(
        new Request('https://animes.garden/subject/100', {
          headers: { Accept: 'text/markdown' }
        })
      ).then((response) => response.text()),
      handleMarkdownRequest(
        new Request('https://animes.garden/collection/abc', {
          headers: { Accept: 'text/markdown' }
        })
      ).then((response) => response.text())
    ]);

    expect(resources).toContain(
      'title: "最新动画资源 | Anime Garden 動漫花園資源網镜像站 动漫花园动画 BT 资源聚合站"'
    );
    expect(resources).toContain('# 最新动画资源');
    expect(resources).toContain('RSS 订阅：https://api.animes.garden/feed.xml?');
    expect(resources).not.toContain(
      '# 最新动画资源 \\| Anime Garden 動漫花園資源網镜像站 动漫花园动画 BT 资源聚合站'
    );
    expect(subject).toContain(
      'title: "Subject Title 最新资源 | Anime Garden 動漫花園資源網镜像站 动漫花园动画 BT 资源聚合站"'
    );
    expect(subject).toContain('description: "Subject Title: Subject summary"');
    expect(subject).toContain('# Subject Title');
    expect(subject).not.toContain('# Subject Title 最新资源');
    expect(subject).toContain('## Test/Sub字幕组 最新资源');
    expect(collection).toContain(
      'title: "My Collection | Anime Garden 動漫花園資源網镜像站 动漫花园动画 BT 资源聚合站"'
    );
    expect(collection).toContain(
      'description: "Anime Garden 资源收藏夹, 動漫花園資源網镜像站, 动漫花园动画 BT 资源聚合站"'
    );
  });

  it('redirects invalid resources page numbers like the HTML route', async () => {
    const response = await handleMarkdownRequest(
      new Request('https://animes.garden/resources/0?type=%E5%8A%A8%E7%94%BB', {
        headers: { Accept: 'text/markdown' }
      })
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/resources/1?type=%E5%8A%A8%E7%94%BB');
    expect(response.headers.get('vary')).toBe('Accept');
    expect(await response.text()).toBe('');
  });

  it('redirects invalid resources page numbers with trailing slash', async () => {
    const response = await handleMarkdownRequest(
      new Request('https://animes.garden/resources/0/?type=%E5%8A%A8%E7%94%BB', {
        headers: { Accept: 'text/markdown' }
      })
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/resources/1?type=%E5%8A%A8%E7%94%BB');
  });

  it('renders anime calendar markdown from bgmd weekday groups', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T12:00:00+08:00'));

    try {
      const response = await handleMarkdownRequest(
        new Request('https://animes.garden/anime', { headers: { Accept: 'text/markdown' } })
      );
      const body = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/markdown');
      expect(body).toContain(
        'title: "动画周历 | Anime Garden 動漫花園資源網镜像站 动漫花园动画 BT 资源聚合站"'
      );
      expect(body).toContain(
        'description: "动画每周播出时间表, 动画周历, Anime Garden 動漫花園資源網镜像站 动漫花园动画 BT 资源聚合站"'
      );
      expect(body).toContain('# 动画周历');
      expect(body.indexOf('## 星期一')).toBeLessThan(body.indexOf('## 星期二'));
      expect(body).toContain('Subject Title - /subject/100');
      expect(body).toContain('Another Title - /subject/101');
    } finally {
      vi.useRealTimers();
    }
  });

  it('omits the body for HEAD markdown requests', async () => {
    const response = await handleMarkdownRequest(
      new Request('https://animes.garden/', {
        method: 'HEAD',
        headers: { Accept: 'text/markdown' }
      })
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
    expect(response.headers.get('x-markdown-tokens')).toMatch(/^\d+$/);
  });
});
