import type { JSX } from 'react';

import { SITE_GITHUB_URL, SITE_LOGO_URL, SITE_NAME, SITE_ORIGIN, SITE_URL } from './constants';

export interface SubjectSchemaInput {
  canonical: string;
  subjectId: string | number;
  name: string;
  description?: string;
  entityType?: 'TVSeries' | 'CreativeWork';
  image?: string;
}

export interface EpisodeSchemaInput {
  canonical: string;
  name: string;
  description: string;
  seriesName: string;
  seriesUrl?: string;
  episodeNumber: number;
  image?: string;
}

export interface VideoSchemaInput {
  canonical: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  embedUrl: string;
}

/**
 * Adapts TanStack Router's runtime JSON-LD descriptor to its React head type.
 * The runtime handles `script:ld+json`, while the React declaration currently exposes meta attrs only.
 */
export function toJsonLdMeta(schema: Record<string, unknown>) {
  return { 'script:ld+json': schema } as unknown as JSX.IntrinsicElements['meta'];
}

/** Describes the site identity and publisher on the domain home page. */
export function buildWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_ORIGIN}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        alternateName: ['動漫花園第三方镜像站', 'animes.garden'],
        publisher: { '@id': `${SITE_ORIGIN}/#organization` }
      },
      {
        '@type': 'Organization',
        '@id': `${SITE_ORIGIN}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: {
          '@type': 'ImageObject',
          url: SITE_LOGO_URL,
          width: 512,
          height: 512
        },
        sameAs: [SITE_GITHUB_URL]
      }
    ]
  };
}

/** Describes a subject landing page without overstating non-TV works as a TV series. */
export function buildSubjectSchema(input: SubjectSchemaInput) {
  const pageId = `${input.canonical}#webpage`;
  const seriesId = `${input.canonical}#series`;
  const imageId = `${input.canonical}#poster`;
  const page: Record<string, unknown> = {
    '@type': 'WebPage',
    '@id': pageId,
    url: input.canonical,
    name: input.name,
    isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
    mainEntity: { '@id': seriesId }
  };
  const series: Record<string, unknown> = {
    '@type': input.entityType ?? 'CreativeWork',
    '@id': seriesId,
    url: input.canonical,
    name: input.name,
    identifier: String(input.subjectId)
  };
  const graph: Record<string, unknown>[] = [page, series];

  if (input.description) {
    page.description = input.description;
    series.description = input.description;
  }

  if (input.image) {
    page.primaryImageOfPage = { '@id': imageId };
    series.image = { '@id': imageId };
    graph.push({
      '@type': 'ImageObject',
      '@id': imageId,
      url: input.image
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

/** Describes a reliably parsed episode without inventing an air date. */
export function buildEpisodeSchema(input: EpisodeSchemaInput) {
  const pageId = `${input.canonical}#webpage`;
  const episodeId = `${input.canonical}#episode`;
  const seriesId = input.seriesUrl ? `${input.seriesUrl}#series` : `${input.canonical}#series`;
  const page: Record<string, unknown> = {
    '@type': 'WebPage',
    '@id': pageId,
    url: input.canonical,
    name: input.name,
    description: input.description,
    isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
    mainEntity: { '@id': episodeId }
  };
  const episode: Record<string, unknown> = {
    '@type': 'TVEpisode',
    '@id': episodeId,
    url: input.canonical,
    name: input.name,
    description: input.description,
    episodeNumber: input.episodeNumber,
    partOfTVSeries: {
      '@type': 'TVSeries',
      '@id': seriesId,
      name: input.seriesName,
      ...(input.seriesUrl ? { url: input.seriesUrl } : {})
    }
  };

  if (input.image) {
    page.primaryImageOfPage = input.image;
    episode.image = input.image;
  }

  return { '@context': 'https://schema.org', '@graph': [page, episode] };
}

/** Describes a playable resource using Google's required video fields and its external player. */
export function buildVideoSchema(input: VideoSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    '@id': `${input.canonical}#video`,
    url: input.canonical,
    name: input.name,
    description: input.description,
    thumbnailUrl: input.thumbnailUrl,
    uploadDate: input.uploadDate,
    embedUrl: input.embedUrl
  };
}
