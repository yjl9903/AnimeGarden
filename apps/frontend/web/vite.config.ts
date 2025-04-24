import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vite';
import { vitePlugin as remix } from '@remix-run/dev';

import Icons from 'unplugin-icons/vite';
import UnoCSS from 'unocss/vite';
import Info from 'unplugin-info/vite';
import Analytics from 'unplugin-analytics/vite';
import Inline from 'vite-plugin-inline';

import { env } from './node/env';

const { APP_HOST, FEED_HOST, SERVER_URL, KEEPSHARE } = env();

// Analytics Engines
const UMAMI_HOST = process.env.UMAMI_HOST || `umami.animes.garden`;
const UMAMI_ID = process.env.UMAMI_ID || `bcff225d-6590-498e-9b39-3a5fc5c2b4d1`;
// const PLAUSIBLE_HOST = `animes.garden`;
// const CLARITY = `nbvdca15ui`;
// const CF_BEACON = `7307ee3d2d8f4bafac906844704dab10`;

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
    minify: false,
    target: 'es2022'
  },
  plugins: [
    Info({
      env: {
        /**
         * Keepshare id
         */
        KEEPSHARE,
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
        SERVER_URL
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
        v3_throwAbortReason: true
      }
    }),
    Icons({ compiler: 'jsx', jsx: 'react' }),
    tsconfigPaths(),
    Inline(),
    {
      name: 'animegarden-web:print',
      buildStart() {
        console.log(`  ➜  APP host:   ${APP_HOST}`);
        console.log(`  ➜  API Server: ${SERVER_URL}`);
      }
    }
  ]
});
