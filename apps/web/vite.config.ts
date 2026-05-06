import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vite';
import { vitePlugin as remix } from '@remix-run/dev';

import Icons from 'unplugin-icons/vite';
import UnoCSS from 'unocss/vite';
import Info from 'unplugin-info/vite';
import Analytics from 'unplugin-analytics/vite';
import Inline from 'vite-plugin-inline';

import { bold, green, cyan } from 'breadc';

import { env } from './node/env.ts';

const { APP_HOST, FEED_HOST, WEB_SERVER_URL, KEEPSHARE_ID, UMAMI_HOST, UMAMI_ID } = env();

export default defineConfig({
  ssr: {
    resolve: {
      conditions: ['workerd', 'worker', 'browser']
    }
  },
  resolve: {
    mainFields: ['browser', 'module', 'main'],
    alias: { '@': path.resolve(__dirname, './app') }
  },
  build: {
    minify: true,
    target: 'es2022'
  },
  plugins: [
    Info({
      env: {
        /**
         * Keepshare id
         */
        KEEPSHARE_ID,
        /**
         * The host of app
         */
        APP_HOST,
        /**
         * The host of feed.xml
         */
        FEED_HOST,
        /**
         * The URL of API server
         */
        WEB_SERVER_URL
      },
      cloudflare: process.env.SSR_ADAPTER === 'cloudflare'
    }),
    Analytics({
      analytics: {
        umami: {
          src: UMAMI_HOST,
          id: UMAMI_ID
        }
        // plausible: {
        //   domain: PLAUSIBLE_HOST
        // },
        // clarity: {
        //   id: CLARITY
        // },
        // cloudflare: {
        //   beacon: CF_BEACON
        // }
      }
    }),
    UnoCSS(),
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true
      }
    }),
    Icons({ compiler: 'jsx', jsx: 'react' }),
    tsconfigPaths(),
    Inline(),
    {
      name: 'animegarden-web:print',
      buildStart() {
        const symbol = '__PRINT_ANIMEGARDEN_WEB_ENV__';
        // @ts-expect-error
        if (!globalThis[symbol]) {
          // @ts-expect-error
          globalThis[symbol] = true;
          console.log(`  ${bold(green('➜'))}  ${bold('App')}:     ${cyan(APP_HOST)}`);
          console.log(`  ${bold(green('➜'))}  ${bold('Feed')}:    ${cyan(FEED_HOST)}`);
          console.log(`  ${bold(green('➜'))}  ${bold('Server')}:  ${cyan(WEB_SERVER_URL)}`);
        }
      }
    }
  ]
});
