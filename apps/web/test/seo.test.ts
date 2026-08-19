import { describe, expect, it } from 'vitest';

import { buildHomePageHead } from '../src/pages/_index/seo';
import { buildAboutPageHead } from '../src/pages/about/seo';
import { buildAnimePageHead } from '../src/pages/anime/seo';
import { buildCollectionPageHead } from '../src/pages/collection.$hash/seo';
import { buildDetailPageHead } from '../src/pages/detail.$provider.$providerId/seo';
import { buildDocsApiPageSeo } from '../src/pages/docs.api/seo';
import { buildIframePageHead, buildIframePageSeo } from '../src/pages/iframe/seo';
import {
  buildResourcesPageHead,
  buildResourcesPageSeo,
  generateResourcesFilterDescription
} from '../src/pages/resources.($page)/seo';
import {
  buildSubjectPageHead,
  buildSubjectPageSeo
} from '../src/pages/subject.$subject.($page)/seo';
import type { WebBgmSubject } from '../src/utils/subject';

import {
  SITE_NAME,
  buildEpisodeSchema,
  buildOpenGraphMeta,
  buildPageTitle,
  buildSubjectSchema,
  buildWebsiteSchema,
  normalizeSeoText,
  toJsonLdMeta
} from '../src/utils/seo';

describe('SEO metadata', () => {
  it('builds concise site and page titles', () => {
    expect(buildPageTitle()).toBe('Anime Garden 動漫花園第三方镜像站以及动画 BT 资源聚合站');
    expect(buildPageTitle('2026 年夏季新番放送时间表')).toBe(
      '2026 年夏季新番放送时间表 | Anime Garden'
    );
    expect(buildDocsApiPageSeo().title).toBe('Open API 文档 | Anime Garden');
  });

  it('normalizes upstream HTML for descriptions', () => {
    expect(normalizeSeoText('<p>Anime&nbsp;Garden &amp; 動漫花園&hellip;</p>&#x1F338;')).toBe(
      'Anime Garden & 動漫花園… 🌸'
    );
  });

  it('describes the website identity', () => {
    const schema = buildWebsiteSchema();
    expect(schema['@graph']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ '@type': 'WebSite', name: SITE_NAME }),
        expect.objectContaining({ '@type': 'Organization', name: SITE_NAME })
      ])
    );
  });

  it('links subject pages to a TV series and poster', () => {
    const schema = buildSubjectSchema({
      canonical: 'https://animes.garden/subject/123',
      subjectId: 123,
      name: '测试动画',
      description: '测试简介',
      entityType: 'TVSeries',
      image: 'https://bgm.example/poster.jpg'
    });
    expect(schema['@graph']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ '@type': 'WebPage' }),
        expect.objectContaining({ '@type': 'TVSeries', identifier: '123' }),
        expect.objectContaining({ '@type': 'ImageObject' })
      ])
    );
  });

  it('uses a generic creative work for non-TV subjects', () => {
    const schema = buildSubjectSchema({
      canonical: 'https://animes.garden/subject/456',
      subjectId: 456,
      name: '测试作品',
      description: '测试简介'
    });
    expect(schema['@graph']).toEqual(
      expect.arrayContaining([expect.objectContaining({ '@type': 'CreativeWork' })])
    );
  });

  it('uses property attributes for Open Graph and preserves JSON-LD descriptors', () => {
    expect(
      buildOpenGraphMeta({ title: '测试', description: '简介', url: 'https://animes.garden/' })
    ).toEqual(expect.arrayContaining([expect.objectContaining({ property: 'og:title' })]));
    expect(toJsonLdMeta({ '@context': 'https://schema.org', '@type': 'WebSite' })).toHaveProperty(
      'script:ld+json'
    );
  });

  it('does not invent an episode publication date', () => {
    const schema = buildEpisodeSchema({
      canonical: 'https://animes.garden/detail/dmhy/123',
      name: '测试动画 第 1 集',
      description: '测试简介',
      seriesName: '测试动画',
      episodeNumber: 1
    });
    expect(JSON.stringify(schema)).not.toContain('datePublished');
  });

  it('builds complete canonical and social metadata inside page modules', () => {
    const home = buildHomePageHead();
    const calendar = buildAnimePageHead('2026-07');
    const resources = buildResourcesPageHead({ types: ['动画'] }, {}, 2);

    expect(home.links).toContainEqual({ rel: 'canonical', href: 'https://animes.garden/' });
    expect(home.meta).toContainEqual(
      expect.objectContaining({
        property: 'og:title',
        content: 'Anime Garden 動漫花園第三方镜像站以及动画 BT 资源聚合站'
      })
    );
    expect(calendar.links).toContainEqual({
      rel: 'canonical',
      href: 'https://animes.garden/calendar/2026-07'
    });
    expect(resources.links).toContainEqual({
      rel: 'canonical',
      href: 'https://animes.garden/resources/2?type=%E5%8A%A8%E7%94%BB'
    });
  });

  it('reuses resources SEO data for iframe pages', () => {
    expect(buildIframePageSeo(undefined, {})).toEqual(buildResourcesPageSeo(undefined, {}));
    expect(buildIframePageSeo({ types: ['动画'] }, {})).toEqual(
      buildResourcesPageSeo({ types: ['动画'] }, {})
    );
  });

  it('builds human-readable resources descriptions from filters', () => {
    expect(buildResourcesPageSeo(undefined, {}).description).toBe(
      'Anime Garden 动画 BT 资源聚合列表，支持按作品、字幕组、发布者、资源类型和发布时间筛选。'
    );
    expect(
      generateResourcesFilterDescription({ types: ['动画'], fansubs: ['测试字幕组'] }, {})
    ).toBe('资源类型“动画”；字幕组“测试字幕组”');
    expect(buildResourcesPageSeo({ keywords: ['测试作品'] }, {}).description).toBe(
      '测试作品 最新动画资源。筛选条件：包含关键词“测试作品”。'
    );
    expect(buildResourcesPageSeo({ search: ['测试作品'], fansubs: ['测试字幕组'] }, {})).toEqual(
      expect.objectContaining({
        title: '测试作品 测试字幕组 最新动画资源 | Anime Garden',
        description:
          '测试作品 测试字幕组 最新动画资源。筛选条件：字幕组“测试字幕组”；标题搜索“测试作品”。'
      })
    );
    expect(
      buildResourcesPageSeo(
        { subjects: [100], publishers: ['测试发布者'] },
        { 100: createSeoSubject(100) }
      )
    ).toEqual(
      expect.objectContaining({
        title: '测试动画 测试发布者 最新动画资源 | Anime Garden',
        description:
          '测试动画 测试发布者 最新动画资源。筛选条件：作品“测试动画”；发布者“测试发布者”。'
      })
    );
  });

  it('indexes only stable or simple resource filters', () => {
    const indexableFilters = [
      undefined,
      { preset: 'bangumi' as const },
      { preset: 'bangumi' as const, types: ['动画', '合集'] },
      { preset: 'bangumi' as const, types: ['动画', '合集', 'RAW'] },
      { types: ['动画'] },
      { fansubs: ['测试字幕组'] },
      { publishers: ['测试发布者'] },
      { search: ['测试作品'] },
      { keywords: ['测试作品'] },
      { search: ['测试作品'], fansubs: ['测试字幕组'] },
      { keywords: ['测试作品'], publishers: ['测试发布者'] },
      { subjects: [100], fansubs: ['测试字幕组'] },
      { subjects: [100], publishers: ['测试发布者'] }
    ];
    for (const filter of indexableFilters) {
      const subjects: Record<number, Pick<WebBgmSubject, 'title'>> = filter?.subjects
        ? { 100: createSeoSubject(100) }
        : {};
      expect(buildResourcesPageHead(filter, subjects, 1, true).meta).not.toContainEqual({
        name: 'robots',
        content: 'noindex,follow'
      });
    }

    const noindexFilters = [
      { include: ['测试作品'] },
      { preset: 'bangumi' as const, types: ['动画', '合集', 'RAW', '音乐'] },
      { search: ['作品一', '作品二'] },
      { keywords: ['作品一', '作品二'] },
      { types: ['动画'], fansubs: ['测试字幕组'] },
      { search: ['测试作品'], fansubs: ['字幕组一', '字幕组二'] },
      { search: ['测试作品'], fansubs: ['测试字幕组'], publishers: ['测试发布者'] },
      { after: new Date('2026-01-01T00:00:00.000Z') }
    ];
    for (const filter of noindexFilters) {
      expect(buildResourcesPageHead(filter, {}, 1, true).meta).toContainEqual({
        name: 'robots',
        content: 'noindex,follow'
      });
    }

    expect(buildResourcesPageHead({ types: ['动画'] }, {}, 1, false).meta).toContainEqual({
      name: 'robots',
      content: 'noindex,follow'
    });
  });

  it('canonicalizes a single Subject resource filter to the Subject page', () => {
    const subject = createSeoSubject(100);
    const head = buildResourcesPageHead({ subjects: [100] }, { 100: subject }, 1, true);

    expect(head.links).toEqual([{ rel: 'canonical', href: 'https://animes.garden/subject/100' }]);
    expect(head.meta).not.toContainEqual({ name: 'robots', content: 'noindex,follow' });

    const combined = buildResourcesPageHead(
      { subjects: [100], fansubs: ['测试字幕组'] },
      { 100: subject },
      1,
      true
    );
    expect(combined.links[0]?.href).toContain('/resources/1?');
    expect(combined.meta).not.toContainEqual({ name: 'robots', content: 'noindex,follow' });
  });

  it('builds Subject and detail structured data inside page modules', () => {
    const subject = {
      id: 100,
      title: '测试动画',
      platform: 'TV',
      poster: 'https://example.com/poster.jpg',
      summary: '测试简介',
      alias: {},
      tags: [],
      search: { include: ['测试动画'] }
    } satisfies WebBgmSubject;
    const subjectHead = buildSubjectPageHead(subject, undefined, '100');
    const detailHead = buildDetailPageHead({
      resource: {
        title: '测试动画 [01]',
        type: '动画',
        magnet: 'magnet:?xt=urn:btih:abc&tr=https://tracker.example',
        createdAt: '2026-08-19T08:00:00+08:00'
      },
      description: {
        html: '<p>测试简介</p>',
        plain: '测试简介',
        summary: '测试简介',
        images: []
      },
      fallbackDescription: undefined,
      subject,
      provider: 'dmhy',
      providerId: '123'
    });

    expect(JSON.stringify(subjectHead.meta)).toContain('TVSeries');
    expect(buildSubjectPageSeo(subject).description).toBe('测试简介');
    expect(detailHead.links).toContainEqual({
      rel: 'canonical',
      href: 'https://animes.garden/detail/dmhy/123'
    });
    expect(JSON.stringify(detailHead.meta)).toContain('VideoObject');
    expect(JSON.stringify(detailHead.meta)).toContain(
      'https://keepshare.org/gv78k1oi/magnet%3A%3Fxt%3Durn%3Abtih%3Aabc'
    );
    expect(JSON.stringify(detailHead.meta)).toContain('2026-08-19T00:00:00.000Z');
    expect(JSON.stringify(detailHead.meta)).not.toContain('contentUrl');
  });

  it('omits incomplete Detail video structured data', () => {
    const detailHead = buildDetailPageHead({
      resource: {
        title: '测试动画 [01]',
        type: '动画',
        magnet: 'magnet:?xt=urn:btih:abc',
        createdAt: '2026-08-19T08:00:00+08:00'
      },
      description: {
        html: '<p>测试简介</p>',
        plain: '测试简介',
        summary: '测试简介',
        images: []
      },
      fallbackDescription: undefined,
      subject: undefined,
      provider: 'dmhy',
      providerId: '124'
    });

    expect(JSON.stringify(detailHead.meta)).not.toContain('VideoObject');
  });

  it('omits every Subject description when the upstream summary is empty', () => {
    const subject = {
      id: 101,
      title: '无简介动画',
      platform: 'TV',
      poster: 'https://example.com/poster.jpg',
      summary: '',
      alias: {},
      tags: [],
      search: { include: ['无简介动画'] }
    } satisfies WebBgmSubject;
    const seo = buildSubjectPageSeo(subject);
    const head = buildSubjectPageHead(subject, undefined, '101');

    expect(seo.description).toBeUndefined();
    expect(JSON.stringify(head.meta)).not.toContain('description');
  });

  it('keeps noindex head generation inside noindex page modules', () => {
    for (const head of [
      buildAboutPageHead(),
      buildCollectionPageHead('测试收藏夹', 'abc'),
      buildIframePageHead(undefined, undefined)
    ]) {
      expect(head.meta).toContainEqual({ name: 'robots', content: 'noindex,follow' });
    }
  });
});

function createSeoSubject(id: number) {
  return {
    id,
    title: '测试动画',
    platform: 'TV',
    poster: '',
    summary: '',
    alias: {},
    tags: [],
    search: { include: ['测试动画'] }
  } satisfies WebBgmSubject;
}
