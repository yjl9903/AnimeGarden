import { getCanonicalURL } from '~/utils/canonical';
import { buildPageTitle, NoIndexMeta, type PageSeoData } from '~/utils/seo';

/** Returns collection SEO data shared by HTML and Markdown responses. */
export function buildCollectionPageSeo(name: string | undefined): PageSeoData {
  return {
    title: buildPageTitle(name ?? '资源收藏夹'),
    description: name
      ? `查看 Anime Garden 收藏夹“${name}”中的动画资源。`
      : '查看 Anime Garden 资源收藏夹中的动画资源。'
  };
}

/** Builds the complete noindex HTML head configuration for a collection page. */
export function buildCollectionPageHead(name: string | undefined, hash: string) {
  const seo = buildCollectionPageSeo(name);

  return {
    meta: [{ title: seo.title }, { name: 'description', content: seo.description }, NoIndexMeta],
    links: [{ rel: 'canonical', href: getCanonicalURL(`/collection/${hash}`) }]
  };
}
