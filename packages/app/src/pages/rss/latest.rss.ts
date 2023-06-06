import type { APIRoute } from 'astro';

import rss from '@astrojs/rss';

export const get: APIRoute = (context) => {
  return rss({
    title: 'Anime Garden Latest',
    description: '',
    site: context.site!.origin,
    items: []
  });
};
