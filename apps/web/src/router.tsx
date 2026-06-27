import { createRouter } from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';

import { routeTree } from './routeTree.gen';
import { createAppStores } from './stores';
import { PendingPage } from './pages/PendingPage';

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

export function getRouter() {
  const queryClient = createQueryClient();
  const router = createRouter({
    routeTree,
    parseSearch: parseRouterSearch,
    stringifySearch: stringifyRouterSearch,
    context: {
      queryClient,
      stores: createAppStores()
    },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPendingComponent: PendingPage
  });

  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data prefetched by route hover/navigation stays fresh for 1 minute by default.
        staleTime: 1000 * 60,
        // Unused query cache is retained for 10 minutes before garbage collection.
        gcTime: 1000 * 60 * 10
      }
    }
  });
}

export function parseRouterSearch(searchStr: string) {
  const params = new URLSearchParams(searchStr.startsWith('?') ? searchStr.slice(1) : searchStr);
  const search: Record<string, string | string[]> = {};

  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    if (values.length === 1) {
      search[key] = values[0];
    } else if (values.length > 1) {
      search[key] = values;
    }
  }

  return search;
}

export function stringifyRouterSearch(search: Record<string, unknown>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(search)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item != null) params.append(key, String(item));
      }
    } else {
      params.set(key, String(value));
    }
  }

  const searchStr = params.toString();
  return searchStr ? `?${searchStr}` : '';
}
