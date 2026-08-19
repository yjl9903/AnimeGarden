import {
  SITE_DESCRIPTION,
  SITE_PREVIEW_IMAGE_URL,
  buildOpenGraphMeta,
  buildPageTitle,
  buildTwitterCardMeta,
  buildWebsiteSchema,
  toJsonLdMeta,
  type PageSeoData
} from '~/utils/seo';
import { getCanonicalURL } from '~/utils/canonical';

/** Returns the home page SEO data shared by HTML and Markdown responses. */
export function buildHomePageSeo(): PageSeoData {
  return {
    title: buildPageTitle(),
    description: SITE_DESCRIPTION,
    image: SITE_PREVIEW_IMAGE_URL,
    imageAlt: 'Anime Garden 动画资源聚合站'
  };
}

/** Builds the complete HTML head configuration for the home page. */
export function buildHomePageHead() {
  const canonical = getCanonicalURL('/');
  const seo = buildHomePageSeo();
  const social = { ...seo, url: canonical };

  return {
    meta: [
      { title: seo.title },
      { name: 'description', content: seo.description },
      toJsonLdMeta(buildWebsiteSchema()),
      ...buildOpenGraphMeta(social),
      ...buildTwitterCardMeta(social)
    ],
    links: [{ rel: 'canonical', href: canonical }]
  };
}
