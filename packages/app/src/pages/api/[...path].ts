import type { APIRoute } from 'astro';

import { WORKER_BASE } from '../../constant';

export const all: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  url.protocol = 'https:';
  url.host = WORKER_BASE;
  url.port = '';
  url.pathname = url.pathname.replace(/^\/api/, '');

  const response = await fetch(new Request(url, request));
  const headers: [string, string][] = [];
  response.headers.forEach((value, key) => {
    headers.push([key, value]);
  });

  return new Response(response.body, {
    headers: {
      'cache-control': request.method === 'GET' ? `public, max-age=3600` : 'no-store',
      ...Object.fromEntries(headers),
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'access-control-allow-headers': 'Content-Type, Cache-Control, Authorization'
    }
  });
};
