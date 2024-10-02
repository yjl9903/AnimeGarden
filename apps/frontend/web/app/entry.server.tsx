/**
 * By default, Remix will handle generating the HTTP Response for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.server
 */

import type { AppLoadContext, EntryContext } from '@remix-run/cloudflare';

import { isbot } from 'isbot';
import { RemixServer } from '@remix-run/react';
// @ts-ignore
import { renderToReadableStream } from 'react-dom/server.browser';

import { createSitemapGenerator } from 'remix-sitemap';

import { APP_HOST } from '~build/env';

const { isSitemapUrl, sitemap } = createSitemapGenerator({
  siteUrl: `https://${APP_HOST}`,
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: [
          '/docs/',
          '/anime/',
          '/detail/',
          '/resource/',
          '/resources/1',
          '/resources/2',
          '/resources/3'
        ],
        disallow: ['/feed.xml', '/api/']
      }
    ]
  }
});

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  // This is ignored so we can keep it in the template for visibility.  Feel
  // free to delete this parameter in your app if you're not using it!
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  loadContext: AppLoadContext
) {
  console.log(request.url, isSitemapUrl(request));
  if (isSitemapUrl(request)) {
    // @ts-ignore
    return await sitemap(request, remixContext);
  }

  const body = await renderToReadableStream(
    <RemixServer context={remixContext} url={request.url} />,
    {
      signal: request.signal,
      onError(error: unknown) {
        // Log streaming rendering errors from inside the shell
        console.error(error);
        responseStatusCode = 500;
      }
    }
  );

  if (isbot(request.headers.get('user-agent') || '')) {
    await body.allReady;
  }

  const headers = new Headers(responseHeaders);
  headers.set('Content-Type', 'text/html');

  return new Response(body, {
    headers,
    status: responseStatusCode
  });
}
