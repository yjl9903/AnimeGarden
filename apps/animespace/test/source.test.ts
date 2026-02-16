import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Resource, FetchResourcesResult } from '@animegarden/client';

import type { SubjectSource } from '../src/subject/source/source.ts';
import type { SubjectResource } from '../src/subject/source/resource.ts';

import { createAnimeSpaceTestKit } from './helpers/animespace.ts';

const kit = createAnimeSpaceTestKit();

afterEach(async () => {
  vi.restoreAllMocks();
  await kit.cleanup();
});

function parseSource(
  source: unknown
): SubjectSource & { animegarden: NonNullable<SubjectSource['animegarden']> } {
  const parsed = kit.parseRawSubject({
    name: 'Subject-A',
    naming: {},
    source
  }).source;
  if (!parsed.animegarden) {
    throw new Error('source.animegarden is required for tests.');
  }
  return {
    ...parsed,
    animegarden: parsed.animegarden
  };
}

describe('source normalization', () => {
  it('rejects empty source object', () => {
    expect(() => parseSource({})).toThrow('source cannot be empty');
  });

  it('rejects source without animegarden config fields', () => {
    expect(() =>
      parseSource({
        order: {
          fansubs: ['A']
        }
      })
    ).toThrow('source.animegarden is required for now');
  });

  it('rejects empty source.animegarden object', () => {
    expect(() => parseSource({ animegarden: {} })).toThrow('source.animegarden cannot be empty');
  });

  it('accepts include only', () => {
    const source = parseSource({
      include: ['A']
    });
    expect(source).toMatchInlineSnapshot(`
      {
        "animegarden": {
          "filter": {
            "after": undefined,
            "before": undefined,
            "exclude": undefined,
            "fansubs": undefined,
            "include": [
              "A",
            ],
            "keywords": undefined,
            "publishers": undefined,
            "search": undefined,
            "subjects": undefined,
            "types": undefined,
          },
        },
        "order": {
          "fansubs": undefined,
          "keywords": undefined,
        },
        "rewrite": [],
      }
    `);
  });

  it('accepts keywords only', () => {
    const source = parseSource({
      keywords: ['1080p']
    });
    expect(source.animegarden.filter.keywords).toMatchInlineSnapshot(`
      [
        "1080p",
      ]
    `);
  });

  it('accepts search only', () => {
    const source = parseSource({
      search: 'Subject'
    });
    expect(source.animegarden.filter.search).toMatchInlineSnapshot(`
      [
        "Subject",
      ]
    `);
  });

  it('accepts subjects only', () => {
    const source = parseSource({
      subjects: [1, 2]
    });
    expect(source.animegarden.filter.subjects).toMatchInlineSnapshot(`
      [
        1,
        2,
      ]
    `);
  });

  it('rejects when include/keywords/search/subjects are all empty', () => {
    expect(() =>
      parseSource({
        include: [],
        keywords: [],
        search: [],
        subjects: []
      })
    ).toThrow('requires at least one non-empty field');
  });

  it('rejects source.animegarden mixed with shortcut fields', () => {
    expect(() =>
      parseSource({
        animegarden: {
          include: ['A']
        },
        include: ['B']
      })
    ).toThrow('cannot be used with shortcut fields');
  });

  it('merges fansub/types/publishers/subjects with dedupe and order preservation', () => {
    const source = parseSource({
      include: ['A'],
      fansub: ['F1', 'F2'],
      fansubs: ['F2', 'F3'],
      type: ['动画', '合集'],
      types: ['合集', 'OVA'],
      publisher: 'P1',
      publishers: ['P2', 'P1'],
      subject: [1, 2],
      subjects: [2, 3]
    });

    expect({
      filter: source.animegarden.filter,
      order: source.order
    }).toMatchInlineSnapshot(`
      {
        "filter": {
          "after": undefined,
          "before": undefined,
          "exclude": undefined,
          "fansubs": [
            "F1",
            "F2",
            "F3",
          ],
          "include": [
            "A",
          ],
          "keywords": undefined,
          "publishers": [
            "P1",
            "P2",
          ],
          "search": undefined,
          "subjects": [
            1,
            2,
            3,
          ],
          "types": [
            "动画",
            "合集",
            "OVA",
          ],
        },
        "order": {
          "fansubs": undefined,
          "keywords": undefined,
        },
      }
    `);
  });

  it('normalizes order.keywords record into ordered array', () => {
    const source = parseSource({
      include: ['A'],
      order: {
        keywords: {
          subtitle: ['简中', '简中', ''],
          quality: ['1080p', 'HEVC']
        }
      }
    });

    expect(source.order.keywords).toMatchInlineSnapshot(`
      [
        {
          "keywords": [
            "简中",
          ],
          "name": "subtitle",
        },
        {
          "keywords": [
            "1080p",
            "HEVC",
          ],
          "name": "quality",
        },
      ]
    `);
  });

  it('returns empty rewrite and order.keywords by default', () => {
    const source = parseSource({
      include: ['A']
    });

    expect({
      rewrite: source.rewrite,
      keywords: source.order.keywords
    }).toMatchInlineSnapshot(`
      {
        "keywords": undefined,
        "rewrite": [],
      }
    `);
  });

  it('normalizes source during RawSubjectSchema parsing', () => {
    const parsed = kit.parseRawSubject({
      name: 'Subject-A',
      naming: {},
      source: {
        include: 'A',
        fansub: 'F1'
      }
    });

    expect(parsed.source).toMatchInlineSnapshot(`
      {
        "animegarden": {
          "filter": {
            "after": undefined,
            "before": undefined,
            "exclude": undefined,
            "fansubs": [
              "F1",
            ],
            "include": [
              "A",
            ],
            "keywords": undefined,
            "publishers": undefined,
            "search": undefined,
            "subjects": undefined,
            "types": undefined,
          },
        },
        "order": {
          "fansubs": undefined,
          "keywords": undefined,
        },
        "rewrite": [],
      }
    `);
  });

  it('expands subject.naming string into naming.name', () => {
    const parsed = kit.parseRawSubject({
      name: 'Subject-A',
      naming: '  命名标题  ',
      source: {
        include: 'A'
      }
    });

    expect(parsed.naming).toMatchInlineSnapshot(`
      {
        "name": "命名标题",
      }
    `);
  });

  it('parses rewrite match shorthand into contain', () => {
    const parsed = parseSource({
      include: ['A'],
      rewrite: [
        {
          match: {
            url: 'https://example.com/resource/1',
            fansub: ['F1', 'F2'],
            season: [1, 2],
            episode: [1, 2, 2]
          },
          apply: {
            episode_offset: 1
          }
        }
      ]
    });

    expect(parsed.rewrite).toMatchInlineSnapshot(`
      [
        {
          "apply": {
            "episodeOffset": 1,
          },
          "match": {
            "episode": {
              "contain": [
                1,
                2,
              ],
            },
            "fansub": {
              "contain": [
                "F1",
                "F2",
              ],
            },
            "season": {
              "contain": [
                1,
                2,
              ],
            },
            "url": {
              "contain": [
                "https://example.com/resource/1",
              ],
            },
          },
        },
      ]
    `);
  });

  it('parses episode range strings', () => {
    const parsed = parseSource({
      include: ['A'],
      rewrite: [
        {
          match: {
            episode: '>= 12'
          },
          apply: {
            season: 2
          }
        },
        {
          match: {
            episode: '<= 3'
          },
          apply: {
            season: 1
          }
        },
        {
          match: {
            episode: '[4, 10]'
          },
          apply: {
            season: 1
          }
        }
      ]
    });

    expect(parsed.rewrite.map((rule) => rule.match.episode)).toMatchInlineSnapshot(`
      [
        {
          "range": [
            12,
            9007199254740991,
          ],
        },
        {
          "range": [
            1,
            3,
          ],
        },
        {
          "range": [
            4,
            10,
          ],
        },
      ]
    `);
  });
});

describe('fetch source resources', () => {
  it('calls manager.fetchResources and transforms resources', async () => {
    const system = await kit.createSystem();
    const fetchResourcesMock = vi
      .spyOn(system.managers.animegarden, 'fetchResources')
      .mockResolvedValue(
        makeSuccessResult([makeResource(1, 'Resource-A'), makeResource(2, 'Resource-B')])
      );
    const transformSubjectResourceMock = vi
      .spyOn(system.managers.animegarden, 'transformSubjectResource')
      .mockImplementation((resource): SubjectResource => {
        return {
          name: resource.title,
          url: `https://example.com/${resource.title}`,
          metadata: {},
          magnet: `magnet:${resource.title}`
        };
      });

    const subject = kit.createSubjectFromSource(system, {
      include: ['A']
    });
    const resources = await subject.fetchResources();

    expect({
      fetchCalls: fetchResourcesMock.mock.calls,
      transformCalls: transformSubjectResourceMock.mock.calls.length,
      resourceNames: resources.map((resource) => resource.name)
    }).toMatchInlineSnapshot(`
      {
        "fetchCalls": [
          [
            {
              "include": [
                "A",
              ],
            },
          ],
        ],
        "resourceNames": [
          "Resource-A",
          "Resource-B",
        ],
        "transformCalls": 2,
      }
    `);
  });

  it('rethrows manager errors', async () => {
    const system = await kit.createSystem();
    const expected = new Error('fetch failed');
    vi.spyOn(system.managers.animegarden, 'fetchResources').mockRejectedValue(expected);
    const subject = kit.createSubjectFromSource(system, {
      include: ['A']
    });

    await expect(subject.fetchResources()).rejects.toThrow('fetch failed');
  });
});

function makeResource(id: number, title: string): Resource<{ tracker: true }> {
  return {
    id,
    provider: 'dmhy',
    providerId: String(id),
    title,
    href: `https://example.com/resource/${id}`,
    type: '动画',
    magnet: `magnet:?xt=urn:btih:${id}`,
    tracker: 'udp://tracker.example:80',
    size: 1024 + id,
    publisher: {
      id: 1,
      name: 'Publisher'
    },
    fansub: {
      id: 10,
      name: 'Fansub'
    },
    createdAt: new Date(`2025-01-01T00:00:0${id}.000Z`),
    fetchedAt: new Date('2025-01-02T00:00:00.000Z')
  };
}

function makeSuccessResult(
  resources: Resource<{ tracker: true }>[]
): FetchResourcesResult<{ tracker: true }> {
  return {
    ok: true,
    resources,
    pagination: {
      page: 1,
      pageSize: resources.length,
      complete: true
    },
    filter: {},
    timestamp: new Date('2025-01-03T00:00:00.000Z'),
    error: undefined
  };
}
