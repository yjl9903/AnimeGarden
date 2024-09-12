import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vite';
import { vitePlugin as remix } from '@remix-run/dev';

import UnoCSS from 'unocss/vite';
import Info from 'unplugin-info/vite';

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
      meta: {
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
