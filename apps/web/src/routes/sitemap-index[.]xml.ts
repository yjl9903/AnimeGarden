import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sitemap-index.xml')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { handleSitemapIndexRequest } = await import('~/sitemap/index.server');

        return handleSitemapIndexRequest(request);
      },
      HEAD: async ({ request }) => {
        const { handleSitemapIndexHeadRequest } = await import('~/sitemap/index.server');

        return handleSitemapIndexHeadRequest(request);
      }
    }
  }
});
