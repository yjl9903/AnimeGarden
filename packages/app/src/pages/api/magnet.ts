import type { APIRoute } from 'astro';

import { getRuntime } from '@astrojs/cloudflare/runtime';

export const get: APIRoute = (context) => {
  const cf = getRuntime<Env>(context.request);

  return {
    headers: {
      'Cache-Control': `public, max-age=3600`,
      'Content-Type': 'application/json;charset=utf-8'
    },
    body: JSON.stringify({
      status: 'ok',
      resources: []
    })
  };
};
