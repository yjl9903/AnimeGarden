import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

import UnoCSS from 'unocss/vite';
import Info from 'unplugin-info/vite';

const APP_HOST = process.env.APP_HOST ?? `garden.breadio.wiki`;
const SERVER_URL = process.env.SERVER_URL ?? `https://garden.breadio.wiki/api/`;

export default defineConfig({
  plugins: [
    Info({
      meta: {
        /**
         * The deployed host of animegarden
         */
        APP_HOST,
        /**
         * The backend server url of animegarden
         */
        SERVER_URL
      }
    }),
    UnoCSS(),
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
    tsconfigPaths(),
  ],
});
