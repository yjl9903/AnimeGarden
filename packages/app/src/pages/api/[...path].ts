import type { APIRoute } from 'astro';

export const get: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  url.protocol = 'https:';
  url.host = 'animegarden.yjl9903.workers.dev';
  url.port = '';
  url.pathname = url.pathname.replace(/^\/api/, '');
  const response = await fetch(new Request(url, request));
  // response.headers.set('cache-control', `public, max-age=3600`);
  // response.headers.set('access-control-allow-origin', `*`);
  // response.headers.set('access-control-allow-methods', `GET, POST, PUT, DELETE, OPTIONS`);
  // response.headers.set('access-control-allow-headers', `Content-Type, Cache-Control`);
  return response;
};
