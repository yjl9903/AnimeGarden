import type { APIRoute } from 'astro';

export const get: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  url.protocol = 'https:';
  url.host = 'animegarden.yjl9903.workers.dev';
  url.port = '';
  url.pathname = url.pathname.replace(/^\/api/, '');
  const response = await fetch(new Request(url, request));
  response.headers.set('Cache-Control', `public, max-age=3600`);
  return response;
};
