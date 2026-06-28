import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vite';
import viteReact from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';

import Icons from 'unplugin-icons/vite';
import UnoCSS from 'unocss/vite';
import Info from 'unplugin-info/vite';
import Analytics from 'unplugin-analytics/vite';
import Inline from 'vite-plugin-inline';

import { bold, green, cyan } from 'breadc';

import { env } from './node/env.ts';

const { APP_HOST, FEED_HOST, WEB_SERVER_URL, KEEPSHARE_ID, UMAMI_HOST, UMAMI_ID } = env();

function publishAgentSkills(outDir: string) {
  const skillName = 'animegarden';
  const source = path.resolve(__dirname, '../../skills', skillName);
  const targetRoot = path.resolve(outDir, '.well-known/agent-skills');
  const target = path.join(targetRoot, skillName);
  const skillPath = path.join(target, 'SKILL.md');

  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(targetRoot, { recursive: true });
  fs.cpSync(source, target, { recursive: true });

  const skill = fs.readFileSync(skillPath, 'utf8');
  const name = skill.match(/^name:\s*(.+)$/m)?.[1].trim();
  const description = skill.match(/^description:\s*(.+)$/m)?.[1].trim();

  if (!name || !description) {
    throw new Error(`Missing name or description in ${skillPath}`);
  }

  fs.writeFileSync(
    path.join(targetRoot, 'index.json'),
    `${JSON.stringify(
      {
        $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
        skills: [
          {
            name,
            type: 'skill-md',
            description,
            url: `/.well-known/agent-skills/${name}/SKILL.md`,
            digest: `sha256:${crypto.createHash('sha256').update(skill).digest('hex')}`
          }
        ]
      },
      null,
      2
    )}\n`
  );
}

export default defineConfig({
  resolve: {
    mainFields: ['browser', 'module', 'main'],
    alias: { '@': path.resolve(__dirname, './src') }
  },
  build: {
    minify: true,
    target: 'es2022'
  },
  plugins: [
    Info({
      env: {
        /**
         * Keepshare id
         */
        KEEPSHARE_ID,
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
        WEB_SERVER_URL
      },
      cloudflare: false
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
    tanstackStart(),
    viteReact(),
    Icons({ compiler: 'jsx', jsx: 'react' }),
    tsconfigPaths(),
    Inline(),
    {
      name: 'animegarden-web:agent-skills',
      apply: 'build',
      writeBundle(options) {
        const outDir = options.dir ? path.resolve(options.dir) : undefined;
        if (outDir?.endsWith(path.join('dist', 'client'))) {
          publishAgentSkills(outDir);
        }
      }
    },
    {
      name: 'animegarden-web:print',
      buildStart() {
        const symbol = '__PRINT_ANIMEGARDEN_WEB_ENV__';
        // @ts-expect-error
        if (!globalThis[symbol]) {
          // @ts-expect-error
          globalThis[symbol] = true;
          console.log(`  ${bold(green('➜'))}  ${bold('App')}:     ${cyan(APP_HOST)}`);
          console.log(`  ${bold(green('➜'))}  ${bold('Feed')}:    ${cyan(FEED_HOST)}`);
          console.log(`  ${bold(green('➜'))}  ${bold('Server')}:  ${cyan(WEB_SERVER_URL)}`);
        }
      }
    }
  ]
});
