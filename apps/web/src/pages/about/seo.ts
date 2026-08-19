import { getCanonicalURL } from '~/utils/canonical';
import { buildPageTitle, NoIndexMeta, type PageSeoData } from '~/utils/seo';

/** Returns the About page SEO data. */
export function buildAboutPageSeo(): PageSeoData {
  return {
    title: buildPageTitle('关于'),
    description: '了解 Anime Garden 的动画资源聚合、动画周历和开放 API。'
  };
}

/** Builds the complete noindex HTML head configuration for the About page. */
export function buildAboutPageHead() {
  const seo = buildAboutPageSeo();

  return {
    meta: [{ title: seo.title }, { name: 'description', content: seo.description }, NoIndexMeta],
    links: [{ rel: 'canonical', href: getCanonicalURL('/about') }]
  };
}
