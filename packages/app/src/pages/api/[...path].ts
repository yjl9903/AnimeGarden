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
  const response = await fetch(subRequest);

  try {
    console.log('Use service binding');
    const resp = await runtime.env.worker.fetch(subRequest);
    console.log(resp);
  } catch (error) {
    console.error(error);
  }

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
