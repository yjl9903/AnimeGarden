import { defineConfig } from 'astro/config';

import uno from 'unocss/astro';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import robotsTxt from 'astro-robots-txt';

import Info from 'vite-plugin-info';
import TsconfigPaths from 'vite-plugin-tsconfig-paths';

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
    })
  ],
  adapter: cloudflare({
    mode: 'directory'
  }),
  vite: {
    plugins: [Info(), TsconfigPaths()]
  }
});
