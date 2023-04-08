import type { APIContext } from 'astro';

import { getRuntime } from '@astrojs/cloudflare/runtime';

export async function get(context: APIContext) {
  const cf = getRuntime(context.request);
  return {
    status: 'ok'
  };
}
