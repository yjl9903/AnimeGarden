import { createFileRoute } from '@tanstack/react-router';

import { ResponseCacheControl } from '~/utils/response';

import { version, license } from '~build/package';
import { getPublicOpenApiSpec } from '~/pages/docs.api/spec';

export const Route = createFileRoute('/openapi.json')({
  server: {
    handlers: {
      GET: async () =>
        Response.json(getPublicOpenApiSpec(version, license), {
          headers: {
            'Cache-Control': ResponseCacheControl.Docs
          }
        })
    }
  }
});
