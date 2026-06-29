import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sitemap-{$sitemap}.xml')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { handleSitemapRequest } = await import('~/sitemap/index.server');

        return handleSitemapRequest(request);
      },
      HEAD: async ({ request }) => {
        const { handleSitemapHeadRequest } = await import('~/sitemap/index.server');

        return handleSitemapHeadRequest(request);
      }
    }
  }
});
