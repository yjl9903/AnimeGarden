import { getCalendarSeason } from '~/utils/calendar-season';
import { getCanonicalURL } from '~/utils/canonical';
import {
  SITE_PREVIEW_IMAGE_URL,
  buildOpenGraphMeta,
  buildPageTitle,
  buildTwitterCardMeta,
  type PageSeoData
} from '~/utils/seo';

/** Returns the selected calendar season SEO data shared by HTML and Markdown responses. */
export function buildAnimePageSeo(season?: string): PageSeoData {
  const calendarSeason = getCalendarSeason(season);
  const titlePrefix = calendarSeason.season ? `${calendarSeason.title}动画周历` : '动画周历';

  return {
    title: buildPageTitle(titlePrefix),
    description: `${titlePrefix}, 动画每周播出时间表, Anime Garden`,
    image: SITE_PREVIEW_IMAGE_URL,
    imageAlt: 'Anime Garden 动画周历'
  };
}

/** Builds the complete HTML head configuration for a calendar season. */
export function buildAnimePageHead(season: string) {
  const canonical = getCanonicalURL(`/calendar/${season}`);
  const seo = buildAnimePageSeo(season);
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
