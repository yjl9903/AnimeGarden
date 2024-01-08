import { defineConfig } from 'astro/config';

import uno from 'unocss/astro';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import robotsTxt from 'astro-robots-txt';
import node from '@astrojs/node';
import cloudflare from '@astrojs/cloudflare';
import PWA from '@vite-pwa/astro';

import Info from 'unplugin-info/astro';
import TsconfigPaths from 'vite-tsconfig-paths';

const SSR_ADAPTER = process.env.SSR_ADAPTER === 'node' ? 'node' : 'cloudflare';

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
          allow: ['/resource/', '/anime/', '/docs/'],
          disallow: ['/resources/', '/api/']
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
      registerType: 'autoUpdate',
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
      // workbox: {
      //   navigateFallback: '/',
      //   globPatterns: ['**/*.{css,js,html,svg,png,ico,txt}']
      // },
      devOptions: {
        enabled: true
      },
      experimental: {
        directoryAndTrailingSlashHandler: true
      }
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
        CF_BEACON: 'aa68fa3bf166467082bc79ba029b057f',
        /**
         * Umami Cloud
         */
        UMAMI_HOST: 'us.umami.is',
        UMAMI_ID: '7e93a10d-26a9-4a3a-aa36-99294a5296f3'
      }
    })
  ],
  adapter:
    SSR_ADAPTER === 'cloudflare'
      ? cloudflare({
          mode: 'directory'
        })
      : node({ mode: 'standalone' }),
  image: {
    service: {
      entrypoint: 'astro/assets/services/noop'
    }
  },
  vite: {
    plugins: [TsconfigPaths()]
  }
});
