import { createFileRoute } from '@tanstack/react-router';

import { ResponseCacheControl } from '~/utils/response';

export const Route = createFileRoute('/.well-known/api-catalog')({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          {
            linkset: [
              {
                anchor: 'https://api.animes.garden/',
                'service-desc': [{ href: '/openapi.json', type: 'application/openapi+json' }]
              }
            ]
          },
          {
            headers: {
              'Cache-Control': ResponseCacheControl.Docs,
              'Content-Type': 'application/linkset+json'
            }
          }
        )
    }
  }
});
