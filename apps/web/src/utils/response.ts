import { createIsomorphicFn } from '@tanstack/react-start';

export const enum ResponseCacheControl {
  List = 'public, max-age=30, s-maxage=60',
  Detail = 'public, max-age=3600, s-maxage=86400',
  Subject = 'public, max-age=3600, s-maxage=86400',
  Calendar = 'public, max-age=3600, s-maxage=86400',
  Docs = 'public, max-age=3600, s-maxage=86400',
  Error = 'no-store'
}

export const enum ResponseStaleTime {
  List = 1000 * 60,
  Detail = 1000 * 60 * 60,
  Subject = 1000 * 60 * 60,
  Calendar = 1000 * 60 * 60
}

export const AgentDiscoveryLinkHeader =
  '</openapi.json>; rel="service-desc", </sitemap-index.xml>; rel="sitemap"; type="application/xml"';

/** Sets HTTP response status during SSR while staying safe for client navigations. */
export const setResponseStatus = createIsomorphicFn()
  .server(async (status: number) => {
    const { setResponseStatus: setTanStackResponseStatus } =
      await import('@tanstack/react-start/server');
    setTanStackResponseStatus(status);
  })
  .client(async (_status: number) => {});

/** Sets Cache-Control during SSR/server functions while no-oping on client navigations. */
export const setCacheControl = createIsomorphicFn()
  .server(async (value: ResponseCacheControl) => {
    const { getResponseHeaders } = await import('@tanstack/react-start/server');
    getResponseHeaders().set('Cache-Control', value);
  })
  .client(async (_value: ResponseCacheControl) => {});

/** Appends RFC 8288 Link headers for homepage agent discovery. */
export const appendLinkHeader = createIsomorphicFn()
  .server(async (value: string) => {
    const { getResponseHeaders } = await import('@tanstack/react-start/server');
    getResponseHeaders().append('Link', value);
  })
  .client(async (_value: string) => {});

/** Marks an upstream failure response as non-cacheable. */
export const setErrorResponse = createIsomorphicFn()
  .server(async (status: number = 502) => {
    const { getResponseHeaders, setResponseStatus: setTanStackResponseStatus } =
      await import('@tanstack/react-start/server');
    setTanStackResponseStatus(status);
    getResponseHeaders().set('Cache-Control', ResponseCacheControl.Error);
  })
  .client(async (_status: number = 502) => {});
