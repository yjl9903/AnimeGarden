import { defineConfig } from 'astro/config';

import uno from 'unocss/astro';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';

import Info from 'vite-plugin-info';
import TsconfigPaths from 'vite-plugin-tsconfig-paths';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [uno(), react()],
  adapter: cloudflare({
    mode: 'directory'
  }),
  vite: {
    plugins: [Info(), TsconfigPaths()]
  }
});
