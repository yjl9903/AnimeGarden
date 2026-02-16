import { afterEach, describe, expect, it } from 'vitest';

import type { ParsedSubjectResource } from '../src/subject/source/resource.ts';

import { Subject } from '../src/subject/subject.ts';
import { SubjectType } from '../src/subject/source/schema.ts';
import { RawCollectionSchema } from '../src/subject/schema.ts';

import { createAnimeSpaceTestKit } from './helpers/animespace.ts';

const kit = createAnimeSpaceTestKit();

afterEach(async () => {
  await kit.cleanup();
});

describe('preference and naming', () => {
  it('parses root preference from anime.yaml', async () => {
    const system = await kit.createSystem({
      yaml: `
preference:
  animegarden:
    after: "2025-01-01"
    before: "2025-12-31"
    type: "动画"
    fansubs: ["字幕组A", "字幕组A", "字幕组B"]
    publisher: "发布组A"
  order:
    fansubs: ["字幕组B", "字幕组A", "字幕组A"]
    keywords:
      quality: ["1080p", "HEVC", "1080p"]
  naming:
    template:
      TV: "{name} S{season}E{episode} {{fansub}}"
      电影: "{name} {{fansub}}"
collections: []
`
    });

    const preference = system.space.preference;
    expect({
      animegarden: {
        after: preference?.animegarden?.after?.toISOString(),
        before: preference?.animegarden?.before?.toISOString(),
        types: preference?.animegarden?.types,
        fansubs: preference?.animegarden?.fansubs,
        publishers: preference?.animegarden?.publishers
      },
      order: preference?.order,
      naming: preference?.naming
    }).toMatchInlineSnapshot(`
      {
        "animegarden": {
          "after": "2025-01-01T00:00:00.000Z",
          "before": "2025-12-31T00:00:00.000Z",
          "fansubs": [
            "字幕组A",
            "字幕组B",
          ],
          "publishers": [
            "发布组A",
          ],
          "types": [
            "动画",
          ],
        },
        "naming": {
          "template": {
            "Movie": "{name} {{fansub}}",
            "TV": "{name} S{season}E{episode} {{fansub}}",
          },
        },
        "order": {
          "fansubs": [
            "字幕组B",
            "字幕组A",
          ],
          "keywords": [
            {
              "keywords": [
                "1080p",
                "HEVC",
              ],
              "name": "quality",
            },
          ],
        },
      }
    `);
  });

  it('applies source and naming inheritance with correct priority', async () => {
    const system = await kit.createSystem({
      yaml: `
preference:
  animegarden:
    after: "2025-01-01"
    fansubs: ["RootFansub"]
    publishers: ["RootPublisher"]
  order:
    fansubs: ["RootOrderFansub"]
    keywords:
      quality: ["1080p"]
  naming:
    template:
      TV: "{name} ROOT S{season}E{episode} {{fansub}}"
collections: []
`
    });

    const rawCollection = RawCollectionSchema.parse({
      preference: {
        animegarden: {
          before: '2025-06-30',
          fansubs: ['CollectionFansub']
        },
        order: {
          fansubs: ['CollectionOrderFansub'],
          keywords: {
            subtitle: ['简中']
          }
        },
        naming: {
          template: {
            TV: '{name} COL S{season}E{episode} {{fansub}}'
          }
        }
      },
      subjects: [
        {
          name: 'Subject-A',
          naming: {},
          source: {
            include: ['Subject-A'],
            publisher: 'SubjectPublisher',
            order: {
              keywords: {
                codec: ['x265']
              }
            }
          }
        }
      ]
    });

    const subject = Subject.fromRaw(system, rawCollection, rawCollection.subjects[0]!);

    expect({
      source: {
        animegarden: {
          after: subject.source.animegarden?.filter.after?.toISOString(),
          before: subject.source.animegarden?.filter.before?.toISOString(),
          fansubs: subject.source.animegarden?.filter.fansubs,
          publishers: subject.source.animegarden?.filter.publishers
        },
        order: subject.source.order
      },
      naming: {
        name: subject.naming.name,
        template: subject.naming.template
      }
    }).toMatchInlineSnapshot(`
      {
        "naming": {
          "name": "Subject-A",
          "template": {
            "Movie": "{name} {{fansub}}",
            "TV": "{name} COL S{season}E{episode} {{fansub}}",
          },
        },
        "source": {
          "animegarden": {
            "after": "2025-01-01T00:00:00.000Z",
            "before": "2025-06-30T00:00:00.000Z",
            "fansubs": [
              "CollectionFansub",
            ],
            "publishers": [
              "SubjectPublisher",
            ],
          },
          "order": {
            "fansubs": [
              "CollectionOrderFansub",
            ],
            "keywords": [
              {
                "keywords": [
                  "x265",
                ],
                "name": "codec",
              },
              {
                "keywords": [
                  "简中",
                ],
                "name": "subtitle",
              },
              {
                "keywords": [
                  "1080p",
                ],
                "name": "quality",
              },
            ],
          },
        },
      }
    `);
  });

  it('allows missing subject.naming input and fills defaults', async () => {
    const system = await kit.createSystem({
      yaml: `
preference:
  naming:
    template:
      TV: "{name} TV {episode}"
collections: []
`
    });

    const rawCollection = RawCollectionSchema.parse({
      subjects: [
        {
          name: 'Subject-No-Naming',
          source: {
            include: ['Subject-No-Naming']
          }
        }
      ]
    });

    const subject = Subject.fromRaw(system, rawCollection, rawCollection.subjects[0]!);
    expect(subject.naming).toMatchInlineSnapshot(`
      {
        "month": undefined,
        "name": "Subject-No-Naming",
        "season": undefined,
        "template": {
          "Movie": "{name} {{fansub}}",
          "TV": "{name} TV {episode}",
        },
        "year": undefined,
      }
    `);
  });

  it('does not override season when metadata has value and renders filename', async () => {
    const system = await kit.createSystem({ yaml: '{}\n' });
    const rawCollection = RawCollectionSchema.parse({
      subjects: [
        {
          name: 'Subject-A',
          naming: {
            name: '命名动画',
            template: {
              TV: '{name} S{season}E{episode} {{fansub}} {year} {month}'
            },
            season: 5,
            year: 2020,
            month: 7
          },
          source: {
            include: ['Subject-A']
          }
        }
      ]
    });
    const subject = Subject.fromRaw(system, rawCollection, rawCollection.subjects[0]!);

    const resource: ParsedSubjectResource = {
      name: '[Fansub] Subject-A - 03',
      url: 'https://example.com/1',
      metadata: {
        season: 2
      },
      parsed: {
        type: SubjectType.TV,
        season: 2,
        episode: 3,
        fansub: 'Fansub',
        year: 2024,
        month: 1
      }
    };

    const extracted = await subject.extractResources([resource]);
    expect(extracted.map((item) => item.extracted)).toMatchInlineSnapshot(`
      [
        {
          "episode": 3,
          "fansub": "Fansub",
          "filename": "命名动画 S02E03 {Fansub} 2020 7",
          "month": 7,
          "season": 2,
          "type": "TV",
          "year": 2020,
        },
      ]
    `);
  });
});
