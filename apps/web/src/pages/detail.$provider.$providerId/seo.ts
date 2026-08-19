import { parse } from 'anipar';
import { truncate } from '@animegarden/shared';

import { getCanonicalURL } from '~/utils/canonical';
import {
  SITE_ORIGIN,
  buildEpisodeSchema,
  buildOpenGraphMeta,
  buildPageTitle,
  buildTwitterCardMeta,
  buildVideoSchema,
  normalizeSeoText,
  toJsonLdMeta,
  type PageSeoData
} from '~/utils/seo';
import { getKeepShareURL } from '~/utils/url';
import { getSubjectDisplayName, type WebBgmSubject } from '~/utils/subject';

import type { DescriptionResult } from '@animegarden/scraper';

/** Returns resource-detail SEO data shared by HTML and Markdown responses. */
export function buildDetailPageSeo(
  resource: { title: string } | undefined,
  description: DescriptionResult | undefined,
  fallbackDescription: string | undefined,
  fallbackImage?: string
): PageSeoData & { displayTitle: string; description: string } {
  const resourceTitle = resource?.title;
  const info = resourceTitle ? parse(resourceTitle) : undefined;
  const displayTitle = info?.title ?? resourceTitle ?? '资源详情';
  const rawDescription = description
    ? description.summary.startsWith(displayTitle)
      ? description.summary
      : `${displayTitle}：${description.summary}`
    : fallbackDescription;
  const normalizedDescription =
    normalizeSeoText(rawDescription) || `查看“${displayTitle}”的资源详情、文件列表和发布信息。`;
  const image = description?.images[0]?.src ?? fallbackImage;

  return {
    displayTitle,
    title: buildPageTitle(resourceTitle ? truncate(resourceTitle, 56) : '资源详情'),
    description: normalizedDescription,
    image,
    imageAlt: image ? `${displayTitle} 海报` : undefined
  };
}

export interface DetailPageHeadInput {
  resource: { title: string; type: string; magnet?: string; createdAt?: Date | string } | undefined;
  description: DescriptionResult | undefined;
  fallbackDescription: string | undefined;
  subject: WebBgmSubject | undefined;
  provider: string;
  providerId: string;
}

/** Builds the complete HTML head configuration for a resource-detail page. */
export function buildDetailPageHead(input: DetailPageHeadInput) {
  const canonical = getCanonicalURL(`/detail/${input.provider}/${input.providerId}`);
  const seo = buildDetailPageSeo(
    input.resource,
    input.description,
    input.fallbackDescription,
    input.subject?.poster
  );
  const social = { ...seo, url: canonical };
  const info = input.resource ? parse(input.resource.title) : undefined;
  const subjectName = getSubjectDisplayName(input.subject) || info?.title;
  const rawEpisodeNumber = info?.episode?.number;
  const episodeNumber = Number(rawEpisodeNumber);
  const isEpisode =
    !!input.resource &&
    !!subjectName &&
    rawEpisodeNumber !== undefined &&
    rawEpisodeNumber !== null &&
    ['动画', '日剧', '特摄'].includes(input.resource.type) &&
    Number.isFinite(episodeNumber);
  const uploadDate = toIsoDate(input.resource?.createdAt);
  // Google requires a representative thumbnail and publication date for VideoObject. Do not
  // emit partial video markup when any required source field is unavailable.
  const isVideo =
    !!input.resource &&
    ['动画', '日剧', '特摄'].includes(input.resource.type) &&
    !!input.resource.magnet &&
    !!seo.image &&
    !!uploadDate;
  const subjectUrl = input.subject?.id ? `${SITE_ORIGIN}/subject/${input.subject.id}` : undefined;
  const structuredData = input.resource
    ? [
        ...(isEpisode
          ? [
              toJsonLdMeta(
                buildEpisodeSchema({
                  canonical,
                  name: input.resource.title,
                  description: seo.description,
                  seriesName: subjectName!,
                  seriesUrl: subjectUrl,
                  episodeNumber,
                  image: seo.image
                })
              )
            ]
          : []),
        ...(isVideo
          ? [
              toJsonLdMeta(
                buildVideoSchema({
                  canonical,
                  name: input.resource.title,
                  description: seo.description,
                  thumbnailUrl: seo.image!,
                  uploadDate: uploadDate!,
                  // KeepShare is a player page, not a directly fetchable media file.
                  embedUrl: getKeepShareURL(input.resource.magnet!)
                })
              )
            ]
          : [])
      ]
    : [];

  return {
    meta: [
      { title: seo.title },
      { name: 'description', content: seo.description },
      ...structuredData,
      ...buildOpenGraphMeta(social),
      ...buildTwitterCardMeta(social)
    ],
    links: [{ rel: 'canonical', href: canonical }]
  };
}

function toIsoDate(value: Date | string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
