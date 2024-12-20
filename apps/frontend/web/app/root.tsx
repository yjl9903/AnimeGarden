import { Links, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';

import { Provider } from 'jotai';
import { kebabCase } from 'scule';
import { useState, useEffect } from 'react';

import global from '~/layouts/global.js?raw';
import { Toaster } from '~/components/ui/sonner';
import { MaxPaddingTop, MaxPaddingBottom } from '~/layouts/Layout';

import Tags from '~analytics/scripts';

import 'virtual:uno.css';

import './styles/main.css';
import './styles/sonner.css';
import './layouts/layout.css';

export function Layout({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  });

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
        {Tags.slice(0, 1).map((t) =>
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
        style={{ '--max-hero-pt': `${MaxPaddingTop}px`, '--max-hero-pb': `${MaxPaddingBottom}px` }}
        suppressHydrationWarning={true}
      >
        <div
          className={
            'page-overlay absolute w-full h-full bg-white z-9999 ' + (isClient ? 'hidden' : '')
          }
          suppressHydrationWarning={true}
        ></div>
        <Provider>{children}</Provider>
        <ScrollRestoration beforeScroll={(_, y) => window.updateHeroLayout?.(y)} />
        <script dangerouslySetInnerHTML={{ __html: global }}></script>
        <Scripts />
        <Toaster />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
