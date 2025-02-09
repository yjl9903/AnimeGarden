#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createConsola } from 'consola';

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore This file won’t exist if it hasn’t yet been built
import * as build from './build/server/index.js'; // eslint-disable-line import/no-unresolved

import { api, remix, cache, sitemaps, MemoryCacheStorage } from './dist/node/index.mjs';

createConsola().withTag('Web').wrapConsole();

const __dirname = fileURLToPath(new URL('./', import.meta.url));

const app = new Hono();
const storage = new MemoryCacheStorage();

app.use(
  '*',
  logger((message, ...rest) => {
    return console.info(message, ...rest);
  })
);

app.all('/api/*', api());
// app.all('/feed.xml', feed());

// Static assets
const ClientRoot = path.join(__dirname, './build/client/');
for (const file of fs.readdirSync(ClientRoot)) {
  const filepath = path.join(ClientRoot, file);
  const stat = fs.lstatSync(filepath);
  if (stat && stat.isFile()) {
    app.all(
      `/${file}`,
      cache({
        cacheName: 'assets',
        cacheControl: 'max-age=86400',
        wait: true,
        caches: storage
      }),
      serveStatic({
        root: path.relative(process.cwd(), ClientRoot),
        path: `/${file}`
      })
    );
  }
}

app.all(
  '/assets/*',
  cache({
    cacheName: 'assets',
    cacheControl: 'max-age=86400',
    wait: true,
    caches: storage
  }),
  serveStatic({ root: path.relative(process.cwd(), ClientRoot) })
);

app.route('/', sitemaps);

app.all('*', remix({ build, mode: process.env.NODE_ENV }));

app.onError((err, c) => {
  console.error(err);
  return c.text('Internal Error', 500);
});

// Listening
const host = process.env.HOST ?? '0.0.0.0';
const port = process.env.PORT ? +process.env.PORT : 3000;

const server = serve(
  {
    fetch: app.fetch,
    hostname: host,
    port
  },
  (info) => {
    console.info(`Start listening on http://${info.address}:${info.port}`);
  }
);

await new Promise((res) => {
  server.addListener('close', () => res());
  server.addListener('error', (err) => {
    console.error(err);
  });
});
