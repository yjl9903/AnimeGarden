import { parseURLSearch, stringifyURLSearch } from '@animegarden/client';

import { errorMarkdown, markdownResponse, type MarkdownResult } from './shared.server';
import { renderAnimeMarkdown } from './anime.server';
import { renderCollectionMarkdown } from './collection.server';
import { renderDetailMarkdown } from './detail.server';
import { renderHomeMarkdown } from './home.server';
import { renderResourcesMarkdown } from './resources.server';
import { renderSubjectMarkdown } from './subject.server';
import { renderSkillsMarkdown } from './skills.server';

export async function handleMarkdownRequest(request: Request) {
  const url = new URL(request.url);
  let result: MarkdownResult;

  try {
    const dispatched = await dispatchMarkdown(url);
    if (dispatched instanceof Response) return dispatched;
    result = dispatched;
  } catch (error) {
    console.error('[Markdown]', url.pathname, error);
    result = errorMarkdown('Markdown 暂不可用', '生成 Markdown 响应失败。');
  }

  return markdownResponse(result, request);
}

async function dispatchMarkdown(url: URL): Promise<MarkdownResult | Response> {
  const pathname = normalizePathname(url.pathname);

  if (pathname === '/') return renderHomeMarkdown();
  if (pathname === '/anime') return renderAnimeMarkdown();
  if (pathname === '/skills') return renderSkillsMarkdown();
  if (pathname === '/resources') return renderResourcesMarkdown(url);
  if (/^\/resources\/[^/]+$/.test(pathname)) {
    const target = new URL('/resources', url.origin);
    target.search = stringifyURLSearch(parseURLSearch(url.searchParams).filter).toString();
    return new Response(null, {
      status: 308,
      headers: {
        Location: target.toString(),
        Vary: 'Accept'
      }
    });
  }

  const calendarMatch = pathname.match(/^\/calendar\/(\d{4}-\d{2})$/);
  if (calendarMatch) return renderAnimeMarkdown(calendarMatch[1]);

  const detailMatch = pathname.match(/^\/detail\/([^/]+)\/([^/]+)$/);
  if (detailMatch) {
    return renderDetailMarkdown(
      decodeURIComponent(detailMatch[1]),
      decodeURIComponent(detailMatch[2])
    );
  }

  const subjectMatch = pathname.match(/^\/subject\/(\d+)$/);
  if (subjectMatch) return renderSubjectMarkdown(Number(subjectMatch[1]));

  const collectionMatch = pathname.match(/^\/collection\/([^/]+)$/);
  if (collectionMatch) return renderCollectionMarkdown(decodeURIComponent(collectionMatch[1]));

  throw new Error(`Unsupported markdown path: ${pathname}`);
}

function normalizePathname(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}
