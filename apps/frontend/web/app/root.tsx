import { Links, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';

import { Provider } from 'jotai';
import { kebabCase } from 'scule';

import { Toaster } from '~/components/ui/sonner';
import { NavHeight, SearchTop, HeroHeight } from '~/layouts/Layout';

import Tags from '~analytics/scripts';

import 'virtual:uno.css';

import './styles/main.css';
import './styles/sonner.css';
import './styles/layout.css';
import './styles/sidebar.css';
import './layouts/Search/cmdk.css';

import scrollHandler from './layouts/global.ts?inline&raw';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
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
        {!import.meta.env.DEV &&
          Tags.map((t) =>
            'src' in t ? (
              <script
                suppressHydrationWarning={true}
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
        className="font-sans relative"
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

export default function App() {
  return <Outlet />;
}
