import { createFileRoute } from '@tanstack/react-router';

import { ResponseCacheControl } from '~/utils/response';

import { version, license } from '~build/package';
import spec from '~/pages/docs.api/spec.json';

export const Route = createFileRoute('/openapi.json')({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          {
            ...spec,
            info: {
              ...spec.info,
              version,
              license: {
                ...spec.info.license,
                name: license
              }
            }
          },
          {
            headers: {
              'Cache-Control': ResponseCacheControl.Docs
            }
          }
        )
    }
  }
});
