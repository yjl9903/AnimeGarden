#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createConsola } from 'consola';

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';

import startEntry from './dist/server/server.js'; // eslint-disable-line import/no-unresolved

createConsola().withTag('Web').wrapConsole();

const __dirname = fileURLToPath(new URL('./', import.meta.url));

const app = new Hono();

app.use(
  '*',
  logger((message, ...rest) => {
    return console.info(message, ...rest);
  })
);

app.all('/health', cors(), (c) => {
  return c.json({ status: 'OK' });
});
app.all('/api/*', cors(), (c) => {
  return c.text('Not Found', 404, {
    'Cache-Control': 'no-store'
  });
});

// Static assets
const ClientRoot = fs.existsSync(path.join(__dirname, './.output/public/'))
  ? path.join(__dirname, './.output/public/')
  : path.join(__dirname, './dist/client/');

if (fs.existsSync(ClientRoot)) {
  for (const file of fs.readdirSync(ClientRoot)) {
    const filepath = path.join(ClientRoot, file);
    const stat = fs.lstatSync(filepath);
    if (stat && stat.isFile()) {
      app.all(
        `/${file}`,
        serveStatic({
          root: path.relative(process.cwd(), ClientRoot),
          path: `/${file}`
        })
      );
    }
  }
}

app.all('/assets/*', serveStatic({ root: path.relative(process.cwd(), ClientRoot) }));
app.all('/.well-known/*', serveStatic({ root: path.relative(process.cwd(), ClientRoot) }));

app.all('*', (c) => startEntry.fetch(c.req.raw));

app.onError((err, c) => {
  console.error('[HONO]', err);
  return c.text('Internal Error', 500, {
    'Cache-Control': 'no-store'
  });
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
