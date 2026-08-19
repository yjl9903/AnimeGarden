import { SITE_NAME, SITE_TAGLINE } from './constants';

export interface PageSeoData {
  title: string;
  description?: string;
  image?: string;
  imageAlt?: string;
}

export interface SocialMetaInput {
  title: string;
  description?: string;
  url: string;
  image?: string;
  imageAlt?: string;
  type?: 'website' | 'article';
}

/** Builds a concise page title with a consistent site-name suffix. */
export function buildPageTitle(title?: string) {
  return title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} ${SITE_TAGLINE}`;
}

/** Removes the standard site-name suffix when rendering an on-page heading. */
export function withoutSiteTitleSuffix(title: string) {
  const suffix = ` | ${SITE_NAME}`;
  return title.endsWith(suffix) ? title.slice(0, -suffix.length) : title;
}

/** Converts upstream text or HTML fragments into a compact meta description. */
export function normalizeSeoText(value: string | null | undefined) {
  return (value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#(?:x[\da-f]+|\d+)|[a-z][\da-z]+);/gi, decodeHtmlEntity)
    .replace(/\s+/g, ' ')
    .trim();
}

const NamedHtmlEntities: Record<string, string> = {
  amp: '&',
  apos: "'",
  copy: '©',
  gt: '>',
  hellip: '…',
  laquo: '«',
  ldquo: '“',
  lsquo: '‘',
  lt: '<',
  mdash: '—',
  middot: '·',
  nbsp: ' ',
  ndash: '–',
  quot: '"',
  raquo: '»',
  rdquo: '”',
  reg: '®',
  rsquo: '’'
};

function decodeHtmlEntity(match: string, entity: string) {
  if (!entity.startsWith('#')) return NamedHtmlEntities[entity.toLowerCase()] ?? match;

  const isHex = entity[1]?.toLowerCase() === 'x';
  const codePoint = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return match;

  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return match;
  }
}

/** Builds standards-compliant Open Graph meta entries. */
export function buildOpenGraphMeta(input: SocialMetaInput) {
  const meta = [
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:locale', content: 'zh_CN' },
    { property: 'og:type', content: input.type ?? 'website' },
    { property: 'og:title', content: input.title },
    { property: 'og:url', content: input.url }
  ];

  if (input.description) meta.push({ property: 'og:description', content: input.description });
  if (input.image) {
    meta.push({ property: 'og:image', content: input.image });
    if (input.imageAlt) meta.push({ property: 'og:image:alt', content: input.imageAlt });
  }

  return meta;
}

/** Builds a summary-large-image Twitter Card when an image is available. */
export function buildTwitterCardMeta(input: SocialMetaInput) {
  const meta = [
    { name: 'twitter:card', content: input.image ? 'summary_large_image' : 'summary' },
    { name: 'twitter:title', content: input.title }
  ];

  if (input.description) meta.push({ name: 'twitter:description', content: input.description });
  if (input.image) {
    meta.push({ name: 'twitter:image', content: input.image });
    if (input.imageAlt) meta.push({ name: 'twitter:image:alt', content: input.imageAlt });
  }

  return meta;
}

export const DefaultRobotsContent = 'max-image-preview:large';

export const NoIndexRobotsContent = 'noindex,follow';

export const NoIndexMeta = { name: 'robots', content: NoIndexRobotsContent } as const;
