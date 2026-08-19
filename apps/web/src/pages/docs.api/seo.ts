import { getCanonicalURL } from '~/utils/canonical';
import {
  SITE_PREVIEW_IMAGE_URL,
  buildOpenGraphMeta,
  buildPageTitle,
  buildTwitterCardMeta,
  type PageSeoData
} from '~/utils/seo';

/** Returns the API documentation page SEO data. */
export function buildDocsApiPageSeo(): PageSeoData {
  return {
    title: buildPageTitle('Open API 文档'),
    description: '查看 Anime Garden 动画 BT 资源开放 API、请求参数、响应结构和交互式调用示例。',
    image: SITE_PREVIEW_IMAGE_URL,
    imageAlt: 'Anime Garden 开放 API 文档'
  };
}

/** Builds the complete HTML head configuration for the API documentation page. */
export function buildDocsApiPageHead() {
  const canonical = getCanonicalURL('/docs/api');
  const seo = buildDocsApiPageSeo();
  const social = { ...seo, url: canonical };

  return {
    meta: [
      { title: seo.title },
      { name: 'description', content: seo.description },
      ...buildOpenGraphMeta(social),
      ...buildTwitterCardMeta(social)
    ],
    links: [{ rel: 'canonical', href: canonical }]
  };
}
