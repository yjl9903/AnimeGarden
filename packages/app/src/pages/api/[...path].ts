import type { APIRoute } from 'astro';

import { getRuntime } from '@astrojs/cloudflare/runtime';

import type { Env } from '../../env';

import { WORKER_BASE } from '../../constant';

export const all: APIRoute = async ({ request }) => {
  const runtime = getRuntime<Env>(request);

  const url = new URL(request.url);
  url.protocol = 'https:';
  url.host = WORKER_BASE;
  url.port = '';
  url.pathname = url.pathname.replace(/^\/api/, '');

  const subRequest = new Request(url, request);
  console.log(Object.entries(runtime?.env.worker));
  console.log(JSON.stringify(subRequest));
  const fetcher =
    typeof runtime?.env.worker.fetch === 'function' ? runtime?.env.worker.fetch : fetch;
  const response = await fetcher(subRequest);

  return new Response(response.body, {
    headers: {
      'cache-control': request.method === 'GET' ? `public, max-age=3600` : 'no-store',
      // @ts-ignore
      ...Object.fromEntries(response.headers.entries()),
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'access-control-allow-headers': 'Content-Type, Cache-Control, Authorization'
    }
  });
};
