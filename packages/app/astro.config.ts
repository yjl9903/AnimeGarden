import { defineConfig } from 'astro/config';

import uno from 'unocss/astro';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import robotsTxt from 'astro-robots-txt';

import Info from 'unplugin-info/astro';
import TsconfigPaths from 'vite-tsconfig-paths';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  site: 'https://garden.onekuma.cn',
  integrations: [
    uno(),
    react(),
    sitemap(),
    robotsTxt({
      policy: [
        {
          userAgent: '*',
          allow: '/resources/',
          disallow: ['/api/', '/rss/']
        }
      ]
    }),
    Info({
      meta: {
        /**
         * The host of Cloudflare Pages
         */
        APP_HOST: 'garden.onekuma.cn',
        /**
         * The host of Cloudflare Worker
         */
        WORKER_HOST: 'animegarden.yjl9903.workers.dev',
        /**
         * Cloudflare Web Analytics configuration
         */
        CF_BEACON: 'e852b1db3a694a5a9b4af6b2cb3d682c'
      }
    })
  ],
  adapter: cloudflare({
    mode: 'directory'
  }),
  image: {
    service: {
      entrypoint: 'astro/assets/services/noop'
    }
  },
  vite: {
    plugins: [
      TsconfigPaths()
    ]
  }
});
