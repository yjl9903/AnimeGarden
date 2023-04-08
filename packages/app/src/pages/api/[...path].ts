import type { APIRoute } from 'astro';

export const all: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  url.protocol = 'https:';
  url.host = 'animegarden.yjl9903.workers.dev';
  url.port = '';
  url.pathname = url.pathname.replace(/^\/api/, '');

  const response = await fetch(new Request(url, request));
  return new Response(response.body, {
    headers: {
      'cache-control': `public, max-age=3600`,
      ...Object.fromEntries(response.headers.entries()),
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'access-control-allow-headers': 'Content-Type, Cache-Control, Authorization'
    }
  });
};
