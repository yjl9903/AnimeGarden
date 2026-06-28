import { createCsrfMiddleware, createMiddleware, createStart } from '@tanstack/react-start';

const markdownNegotiation = createMiddleware({ type: 'request' }).server(
  async ({ handlerType, next, request }) => {
    if (handlerType !== 'router' || !['GET', 'HEAD'].includes(request.method)) {
      return next();
    }

    const acceptsMarkdown = request.headers
      .get('Accept')
      ?.split(',')
      .some((part) => {
        const [type, ...params] = part.trim().toLowerCase().split(';');
        return (
          type === 'text/markdown' &&
          !params.some((param) => {
            const q = param.trim().match(/^q\s*=\s*(.+)$/);
            return q ? Number(q[1]) === 0 : false;
          })
        );
      });

    if (!acceptsMarkdown) {
      return next();
    }

    const rawPathname = new URL(request.url).pathname;
    const pathname = rawPathname.length > 1 ? rawPathname.replace(/\/+$/, '') : rawPathname;
    const supportsMarkdownPage =
      pathname === '/' ||
      pathname === '/anime' ||
      pathname === '/resources' ||
      /^\/resources\/-?\d+(?:\.\d*)?$/.test(pathname) ||
      /^\/detail\/[^/]+\/[^/]+$/.test(pathname) ||
      /^\/subject\/\d+$/.test(pathname) ||
      /^\/collection\/[^/]+$/.test(pathname);

    if (!supportsMarkdownPage) {
      return next();
    }

    const { handleMarkdownRequest } = await import('./markdown/index.server');
    return handleMarkdownRequest(request);
  }
);

export const startInstance = createStart(() => ({
  requestMiddleware: [
    createCsrfMiddleware({
      filter: (ctx) => ctx.handlerType === 'serverFn'
    }),
    markdownNegotiation
  ]
}));
