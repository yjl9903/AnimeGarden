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

  try {
    const subRequest = new Request(url, request.clone());
    const response = runtime?.env?.worker?.fetch
      ? await runtime.env.worker.fetch(subRequest)
      : await fetch(subRequest);

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
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({
        status: 500,
        message: (error as any)?.message ?? 'unknown'
      }),
      { status: 500 }
    );
  }
};
