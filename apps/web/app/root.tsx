import { kebabCase } from 'scule';
import { useEffect } from 'react';
import { Provider, useAtom, useAtomValue } from 'jotai';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError } from '@remix-run/react';

import { Toaster } from '~/components/ui/sonner';
import { NavHeight, SearchTop, HeroHeight } from '~/layouts/Layout';

import Tags from '~analytics/scripts';

import '@onekuma/preset.css';
import 'virtual:uno.css';

import './styles/main.css';
import './styles/sonner.css';
import './styles/layout.css';
import './styles/sidebar.css';
import './layouts/Search/cmdk.css';

import scrollHandler from './layouts/global.ts?inline-ts';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no"
        />
        <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap-index.xml"></link>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="alternate icon" sizes="64x64" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.png" />
        <link rel="mask-icon" color="#FFFFFF" href="/favicon.svg" />
        <meta name="msapplication-TileColor" content="#FFFFFF" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="yandex-verification" content="ff51c9d16e597b3c" />
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
              ></script>
            ) : (
              <script
                suppressHydrationWarning={true}
                key={t.children}
                type={t.type}
                dangerouslySetInnerHTML={{ __html: t.children }}
                {...Object.fromEntries(
                  Object.entries(t.dataset ?? {}).map(([k, v]) => ['data-' + kebabCase(k), v])
                )}
              ></script>
            )
          )}
        <Meta />
        <Links />
      </head>
      <body
        className={`font-sans relative`}
        style={{
          '--nav-height': `${NavHeight}px`,
          '--search-top': `${SearchTop}px`,
          '--hero-height': `${HeroHeight}px`
        }}
        suppressHydrationWarning={true}
      >
        <Provider>{children}</Provider>
        <script
          dangerouslySetInnerHTML={{
            __html: scrollHandler
          }}
          suppressHydrationWarning={true}
        />
        <ScrollRestoration />
        <Scripts />
        <Toaster />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  useEffect(() => {
    console.error('[Route Error]', error);

    const timer = setTimeout(() => {
      if (!sessionStorage.getItem('script_error_reloaded')) {
        sessionStorage.setItem('script_error_reloaded', 'true');
        location.reload();
      }
    }, 3000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  <html lang="zh-CN">
    <head>
      <meta charSet="utf-8" />
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no"
      />
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <link rel="alternate icon" sizes="64x64" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.png" />
      <link rel="mask-icon" color="#FFFFFF" href="/favicon.svg" />
      <meta name="msapplication-TileColor" content="#FFFFFF" />
      <meta name="theme-color" content="#ffffff" />
      <title>错误 | Anime Garden 動漫花園資源網第三方镜像站</title>
      <Meta />
      <Links />
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
      <Scripts />
      <Toaster />
    </body>
  </html>;
}

export default function App() {
  return <Outlet />;
}
