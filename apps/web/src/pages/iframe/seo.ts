import type { ResolvedFilterOptions } from '@animegarden/client';

import { buildResourcesPageSeo } from '~/pages/resources.($page)/seo';
import { NoIndexMeta } from '~/utils/seo';
import type { WebBgmSubject } from '~/utils/subject';

/** Reuses the resources page SEO data for the iframe's current resource filters. */
export function buildIframePageSeo(
  filter: ResolvedFilterOptions | undefined,
  subjects: Record<number, Pick<WebBgmSubject, 'title'>> = {}
) {
  return buildResourcesPageSeo(filter, subjects);
}

/** Builds the complete noindex HTML head configuration for an iframe page. */
export function buildIframePageHead(
  filter: ResolvedFilterOptions | undefined,
  subjects: Record<number, Pick<WebBgmSubject, 'title'>> | undefined
) {
  const seo = buildIframePageSeo(filter, subjects);

  return {
    meta: [{ title: seo.title }, { name: 'description', content: seo.description }, NoIndexMeta]
  };
}
