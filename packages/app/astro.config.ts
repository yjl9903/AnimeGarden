import { defineConfig } from 'astro/config';

import uno from 'unocss/astro';
import cloudflare from '@astrojs/cloudflare';

import Info from 'vite-plugin-info';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [uno()],
  adapter: cloudflare({ mode: 'directory' }),
  vite: {
    plugins: [Info()]
  }
});
