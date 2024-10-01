import { Hono } from 'hono';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore This file won’t exist if it hasn’t yet been built
import * as build from '../build/server'; // eslint-disable-line import/no-unresolved

// eslint-disable-next-line import/no-unresolved
// @ts-ignore
import __STATIC_CONTENT_MANIFEST from '__STATIC_CONTENT_MANIFEST';

import type { Bindings } from './types';

import { remix } from './remix';

export const app = new Hono<{ Bindings: Bindings }>();

app.all('*', remix({ build, manifest: __STATIC_CONTENT_MANIFEST }));

app.all('/api/*', (c) => {
  return c.json({ ok: false });
});

app.onError((err, c) => {
  if (err.message) {
    console.log(...err.message.trim().split('\n'));
  }
  if (err.stack) {
    console.log(...err.stack.trim().split('\n'));
  }
  return c.json({ status: 500, messsage: err?.message ?? 'Internal Error' }, 500);
});
