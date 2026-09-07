import { buildPageTitle, NoIndexMeta } from '~/utils/seo';

/** Builds the minimal head used by true 404 responses. */
export function buildNotFoundPageHead() {
  return {
    meta: [{ title: buildPageTitle('页面不存在') }, NoIndexMeta],
    links: []
  };
}
