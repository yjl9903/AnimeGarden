import { errorMarkdown, markdownResponse, type MarkdownResult } from './shared.server';
import { renderAnimeMarkdown } from './anime.server';
import { renderCollectionMarkdown } from './collection.server';
import { renderDetailMarkdown } from './detail.server';
import { renderHomeMarkdown } from './home.server';
import { renderResourcesMarkdown } from './resources.server';
import { renderSubjectMarkdown } from './subject.server';

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
  if (pathname === '/resources') return renderResourcesMarkdown(url, 1);

  const resourcesMatch = pathname.match(/^\/resources\/(-?\d+(?:\.\d*)?)$/);
  if (resourcesMatch) {
    const page = Math.floor(+resourcesMatch[1]);
    if (page <= 0) return redirectResourcesPage(url);
    return renderResourcesMarkdown(url, page);
  }

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

function redirectResourcesPage(url: URL) {
  const redirectUrl = new URL(url);
  redirectUrl.pathname = normalizePathname(redirectUrl.pathname).replace(/\/-?\d+(\.\d*)?$/, '/1');
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${redirectUrl.pathname}${redirectUrl.search}`,
      'Cache-Control': 'no-store',
      Vary: 'Accept'
    }
  });
}
