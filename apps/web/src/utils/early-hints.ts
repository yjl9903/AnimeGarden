import type { ResponseLinkHeaderFilter } from '@tanstack/react-start/server';

/** Creates a request-local filter for Cloudflare Early Hints response links. */
export function createEarlyHintLinkFilter(): ResponseLinkHeaderFilter {
  let stylesheetCount = 0;

  return function filterEarlyHintLink({ phase, hint }) {
    if (hint.rel === 'preconnect') return true;

    // Only preload build CSS; keep asynchronous font stylesheets and scripts out.
    if (
      phase !== 'static' ||
      hint.rel !== 'preload' ||
      hint.as !== 'style' ||
      !hint.href.startsWith('/assets/') ||
      !hint.href.endsWith('.css')
    ) {
      return false;
    }

    // Bound header size independently for each request, without limiting preconnects.
    return stylesheetCount++ < 3;
  };
}
