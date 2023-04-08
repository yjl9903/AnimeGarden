import type { APIRoute } from 'astro';

import { getRuntime } from '@astrojs/cloudflare/runtime';

export const get: APIRoute = (context) => {
  const cf = getRuntime(context.request);

  return {
    body: JSON.stringify({
      status: 'ok'
    })
  };
};
