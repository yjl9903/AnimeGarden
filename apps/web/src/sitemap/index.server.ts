import { fetchAPI } from '@animegarden/client';
import {
  type SitemapItemLoose,
  safeEtagResponse,
  sitemapIndexResponse,
  sitemapResponse
} from '@animegarden/server';

import { APP_HOST, WEB_SERVER_URL } from '~build/env';

const SITE = `https://${APP_HOST}`;
const START_YEAR = 2020;

interface TeamSitemapResponse {
  teams: Array<{ name: string }>;
}

interface SubjectSitemapResponse {
  subjects: Array<{ id: string | number }>;
}

interface ResourceSitemapResponse {
  resources: Array<{ provider: string; providerId: string | number }>;
}

function isValidMonth(year: number, month: number) {
  const now = new Date();

  return (
    START_YEAR <= year &&
    year <= now.getFullYear() &&
    1 <= month &&
    month <= (year < now.getFullYear() ? 12 : now.getMonth() + 1)
  );
}

function isValidSitemapPathname(pathname: string) {
  if (
    pathname === '/sitemap-0.xml' ||
    pathname === '/sitemap-fansubs.xml' ||
    pathname === '/sitemap-subjects.xml'
  ) {
    return true;
  }

  const match = /^\/sitemap-(\d{4})-(\d{2})\.xml$/.exec(pathname);
  return !!match && isValidMonth(+match[1], +match[2]);
}

async function getSitemapIndexUrls() {
  const pages = ['sitemap-0.xml', 'sitemap-fansubs.xml', 'sitemap-subjects.xml'];
  const months: string[] = [];
  const now = new Date();

  for (let year = START_YEAR; year <= now.getFullYear(); year++) {
    for (let month = 0; month <= (year === now.getFullYear() ? now.getMonth() : 11); month++) {
      months.push(`sitemap-${year}-${String(month + 1).padStart(2, '0')}.xml`);
    }
  }

  return [...pages, ...months.reverse()].map((url) => `${SITE}/${url}`);
}

async function getSitemapUrls(pathname: string): Promise<SitemapItemLoose[] | undefined> {
  try {
    if (pathname === '/sitemap-0.xml') {
      return [
        { url: SITE },
        { url: `${SITE}/anime` },
        { url: `${SITE}/resources/1?preset=bangumi&type=动画` },
        { url: `${SITE}/resources/1?type=动画` },
        { url: `${SITE}/resources/1?type=合集` },
        { url: `${SITE}/resources/1?type=音乐` },
        { url: `${SITE}/resources/1?type=日剧` },
        { url: `${SITE}/resources/1?type=RAW` },
        { url: `${SITE}/resources/1?type=漫画` },
        { url: `${SITE}/resources/1?type=游戏` },
        { url: `${SITE}/resources/1?type=特摄` },
        { url: `${SITE}/resources/1?type=其他` },
        { url: `${SITE}/docs/api` }
      ];
    }

    if (pathname === '/sitemap-fansubs.xml') {
      const data = await fetchAPI<TeamSitemapResponse>('teams', undefined, {
        baseURL: WEB_SERVER_URL,
        retry: 5
      });
      return data.teams.map((team) => ({
        url: `${SITE}/resources/1?fansub=${team.name}`
      }));
    }

    if (pathname === '/sitemap-subjects.xml') {
      const data = await fetchAPI<SubjectSitemapResponse>('sitemaps/subjects', undefined, {
        baseURL: WEB_SERVER_URL,
        retry: 5
      });
      return data.subjects.map((subject) => ({
        url: `${SITE}/subject/${subject.id}`
      }));
    }

    const match = /^\/sitemap-(\d{4})-(\d{2})\.xml$/.exec(pathname);
    if (match && isValidMonth(+match[1], +match[2])) {
      const year = +match[1];
      const month = +match[2];
      const data = await fetchAPI<ResourceSitemapResponse>(`sitemaps/${year}/${month}`, undefined, {
        baseURL: WEB_SERVER_URL,
        retry: 5
      });
      return data.resources.map((resource) => ({
        url: `${SITE}/detail/${resource.provider}/${resource.providerId}`
      }));
    }
  } catch (error) {
    console.error(error);
  }

  return undefined;
}

export async function handleSitemapIndexRequest(_request: Request) {
  return sitemapIndexResponse(await getSitemapIndexUrls());
}

/** Builds the HEAD response from the same sitemap index body used by GET. */
export async function handleSitemapIndexHeadRequest(request: Request) {
  return toHeadResponse(request, await handleSitemapIndexRequest(request));
}

export async function handleSitemapRequest(request: Request) {
  const pathname = new URL(request.url).pathname;

  if (!isValidSitemapPathname(pathname)) {
    return new Response(null, { status: 404 });
  }

  const urls = await getSitemapUrls(pathname);

  return sitemapResponse(
    {
      hostname: SITE,
      lastmodDateOnly: false,
      errorHandler: (error: unknown) => {
        console.error(error);
      }
    },
    urls
  );
}

/** Builds the HEAD response from the same sitemap body used by GET. */
export async function handleSitemapHeadRequest(request: Request) {
  return toHeadResponse(request, await handleSitemapRequest(request));
}

async function toHeadResponse(request: Request, response: Response) {
  const getRequest = new Request(request, {
    method: 'GET'
  });
  const etaggedResponse = await safeEtagResponse(getRequest, response);

  return new Response(null, {
    status: etaggedResponse.status,
    statusText: etaggedResponse.statusText,
    headers: etaggedResponse.headers
  });
}
