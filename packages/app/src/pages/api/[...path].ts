import type { APIRoute } from 'astro';

import useReflare from 'reflare';

export const get: APIRoute = async ({ request }) => {
  const reflare = await useReflare();

  reflare.push({
    path: '/*',
    upstream: {
      domain: 'animegarden.yjl9903.workers.dev',
      protocol: 'https',
      onRequest: (request: Request, url: string): Request => {
        return new Request(url.replace(/^\/api/, ''), request);
      }
    }
  });

  return reflare.handle(request);
};
