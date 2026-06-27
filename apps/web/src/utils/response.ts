import { createIsomorphicFn } from '@tanstack/react-start';

/** Sets HTTP response status during SSR while staying safe for client navigations. */
export const setResponseStatus = createIsomorphicFn()
  .server(async (status: number) => {
    const { setResponseStatus: setTanStackResponseStatus } =
      await import('@tanstack/react-start/server');
    setTanStackResponseStatus(status);
  })
  .client(async (_status: number) => {});
