import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vite';
import { vitePlugin as remix } from '@remix-run/dev';

import UnoCSS from 'unocss/vite';
import Info from 'unplugin-info/vite';
import Analytics from 'unplugin-analytics/vite';

const KEEPSHARE = 'gv78k1oi';

const APP_HOST = process.env.APP_HOST ?? `garden.breadio.wiki`;

const SERVER_HOST = process.env.SERVER_HOST;
const SERVER_PORT = process.env.SERVER_PORT;
const SERVER_PROTOCOL = process.env.SERVER_PROTOCOL ?? 'http'; // http or https
const SERVER_BASE = SERVER_HOST ? (process.env.SERVER_BASE ?? '') : '';

if (SERVER_HOST) {
  console.log(
    `Server is located at: ${SERVER_PROTOCOL}://${SERVER_HOST}${SERVER_PORT ? ':' + SERVER_PORT : ''}${SERVER_BASE}`
  );
}

// Analytics Engines
const UMAMI_HOST = `umami.onekuma.cn`;
const UMAMI_ID = `ac2c4863-3409-4c64-9ac8-fd94bf937583`;
// const PLAUSIBLE_HOST = `garden.breadio.wiki`;
const CLARITY = `nbvdca15ui`;
const CF_BEACON = `7307ee3d2d8f4bafac906844704dab10`;

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
    minify: true
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
         * The host of server
         */
        SERVER_HOST,
        /**
         * The port of server
         */
        SERVER_PORT,
        /**
         * The protocal of server
         */
        SERVER_PROTOCOL,
        /**
         * The base url of server
         */
        SERVER_BASE
      },
      cloudflare: process.env.SSR_ADAPTER === 'cloudflare'
    }),
    Analytics({
      analytics: {
        umami: {
          src: UMAMI_HOST,
          id: UMAMI_ID
        },
        // plausible: {
        //   domain: PLAUSIBLE_HOST
        // },
        clarity: {
          id: CLARITY
        },
        cloudflare: {
          beacon: CF_BEACON
        }
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
    tsconfigPaths()
  ]
});