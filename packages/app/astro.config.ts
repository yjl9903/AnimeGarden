import { fileURLToPath } from 'node:url';

import { defineConfig } from 'astro/config';

import uno from 'unocss/astro';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import robotsTxt from 'astro-robots-txt';
import node from '@astrojs/node';
import cloudflare from '@astrojs/cloudflare';
import PWA from '@vite-pwa/astro';

import Info from 'unplugin-info/astro';
import Analytics from 'unplugin-analytics/astro';

const SSR_ADAPTER = process.env.SSR_ADAPTER === 'cloudflare' ? 'cloudflare' : 'node';

const APP_HOST = process.env.APP_HOST ?? `garden.onekuma.cn`;
const SERVER_HOST = process.env.SERVER_HOST;
const SERVER_PORT = process.env.SERVER_PORT;
const SERVER_PROTOCOL = process.env.SERVER_PROTOCOL ?? 'http'; // http or https

// Analytics Engines
const UMAMI_HOST = `umami.onekuma.cn`;
const UMAMI_ID = `a8602a4a-8d41-4df7-9797-5bd074785f2c`;
const PLAUSIBLE_HOST = `garden.onekuma.cn`;
const CLARITY = `kwj19d7z4j`;
const CF_BEACON = `aa68fa3bf166467082bc79ba029b057f`;

// https://astro.build/config
export default defineConfig({
  output: 'server',
  site: 'https://' + APP_HOST,
  vite: {
    resolve: {
      alias: {
        webtorrent: fileURLToPath(
          new URL('./node_modules/webtorrent/dist/webtorrent.min.js', import.meta.url)
        )
      }
    }
  },
  integrations: [
    uno({ injectReset: true }),
    react(),
    sitemap(),
    robotsTxt({
      policy: [
        {
          userAgent: '*',
          allow: ['/detail/', '/resource/', '/resources/', '/anime/', '/docs/'],
          disallow: ['/feed.xml', '/api/']
        }
      ]
    }),
    PWA({
      includeAssets: [
        'favicon.ico',
        'favicon.svg',
        'apple-touch-icon-180x180.png',
        'maskable-icon-512x512.png',
        'pwa-64x64.png',
        'pwa-192x192.png',
        'pwa-512x512.png'
      ],
      manifest: {
        name: 'Anime Garden',
        short_name: 'animegarden',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // navigateFallback: '/',
        globPatterns: ['**/*.{css,js,html,svg,png,ico,txt}']
      },
      devOptions: {
        enabled: false
      },
      experimental: {
        directoryAndTrailingSlashHandler: true
      }
    }),
    Info({
      meta: {
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
        SERVER_PROTOCOL
      }
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
    })
  ],
  adapter: SSR_ADAPTER === 'cloudflare' ? cloudflare() : node({ mode: 'standalone' }),
  image: {
    service: {
      entrypoint: 'astro/assets/services/noop'
    }
  }
});
