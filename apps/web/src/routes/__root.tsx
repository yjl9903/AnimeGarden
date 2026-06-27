import { kebabCase } from 'scule';
import { lazy, Suspense, type ReactNode, useEffect } from 'react';
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouterState
} from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';

import { Toaster } from '~/components/ui/sonner';
import { NavHeight, SearchTop, HeroHeight } from '~/layouts/Layout';
import type { AppStores } from '~/stores';

import Tags from '~analytics/scripts';

import 'virtual:uno.css';
import '@onekuma/preset.css';

import '~/styles/main.css';
import '~/styles/sonner.css';
import '~/styles/layout.css';
import '~/styles/sidebar.css';
import '~/layouts/Search/cmdk.css';

import scrollHandler from '~/layouts/global.ts?inline-ts';

const WebFontStylesheets = [
  'https://fonts.bunny.net/css?family=ibm-plex-sans|noto-sans-simplified-chinese|input-mono&display=swap',
  'https://api.fontshare.com/v2/css?f[]=quicksand@1,300,400,500,600,700&display=swap'
];

const DevtoolsContent = import.meta.env.DEV
  ? lazy(async () => {
      const [query, router] = await Promise.all([
        import('@tanstack/react-query-devtools'),
        import('@tanstack/react-router-devtools')
      ]);

      return {
        default: () => (
          <>
            <router.TanStackRouterDevtools position="bottom-left" />
            <query.ReactQueryDevtools buttonPosition="bottom-right" />
          </>
        )
      };
    })
  : undefined;

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  stores: AppStores;
}>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no'
      },
      { name: 'msapplication-TileColor', content: '#FFFFFF' },
      { name: 'theme-color', content: '#ffffff' },
      { name: 'yandex-verification', content: 'ff51c9d16e597b3c' }
    ],
    links: [
      { rel: 'sitemap', type: 'application/xml', title: 'Sitemap', href: '/sitemap-index.xml' },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'alternate icon', sizes: '64x64', href: '/favicon.ico' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon-180x180.png' },
      { rel: 'mask-icon', color: '#FFFFFF', href: '/favicon.svg' },
      { rel: 'preconnect', href: 'https://fonts.bunny.net' },
      { rel: 'preconnect', href: 'https://api.fontshare.com' },
      ...WebFontStylesheets.map((href) => ({ rel: 'stylesheet', href }))
    ]
  }),
  component: RootComponent,
  errorComponent: ErrorComponent
});

function RootComponent() {
  const location = useRouterState({ select: (state) => state.location.href });

  useEffect(() => {
    requestAnimationFrame(() => window.__animegardenLayoutController?.update());
  }, [location]);

  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning={true}>
      <head>
        <HeadContent />
        {!import.meta.env.DEV &&
          Tags.map((t) =>
            'src' in t ? (
              <script
                suppressHydrationWarning={true}
                defer={true}
                key={t.src}
                src={t.src}
                {...Object.fromEntries(
                  Object.entries(t.dataset ?? {}).map(([k, v]) => ['data-' + kebabCase(k), v])
                )}
              />
            ) : (
              <script
                suppressHydrationWarning={true}
                key={t.children}
                type={t.type}
                dangerouslySetInnerHTML={{ __html: t.children }}
                {...Object.fromEntries(
                  Object.entries(t.dataset ?? {}).map(([k, v]) => ['data-' + kebabCase(k), v])
                )}
              />
            )
          )}
      </head>
      <body
        className="font-sans relative"
        style={{
          '--nav-height': `${NavHeight}px`,
          '--search-top': `${SearchTop}px`,
          '--hero-height': `${HeroHeight}px`
        }}
        suppressHydrationWarning={true}
      >
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: scrollHandler
          }}
          suppressHydrationWarning={true}
        />
        <Scripts />
        <Toaster />
        <Devtools />
      </body>
    </html>
  );
}

function Devtools() {
  if (!DevtoolsContent) return null;

  return (
    <Suspense fallback={null}>
      <DevtoolsContent />
    </Suspense>
  );
}

function ErrorComponent({ error }: { error: unknown }) {
  useEffect(() => {
    console.error('[Route Error]', error);
  }, [error]);

  return (
    <RootDocument>
      <div />
    </RootDocument>
  );
}
