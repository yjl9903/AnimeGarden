import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { cache } from 'hono/cache';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());
app.use('*', logger());
app.use('*', prettyJSON());

app.get('/', async (c) => {
  return c.json({
    message: 'AnimeGarden - 動漫花園 3-rd party mirror site'
  });
});

app.all('*', (c) =>
  c.json(
    { message: 'This endpoint has been deprecated, please use https://animes.garden/api' },
    404
  )
);

app.onError((err, c) => {
  if (err.message) {
    console.log(...err.message.trim().split('\n'));
  }
  if (err.stack) {
    console.log(...err.stack.trim().split('\n'));
  }
  return c.json({ status: 500, messsage: err?.message ?? 'Internal Error' }, 500);
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const destinationURL = new URL(request.url);
    destinationURL.host = 'animes.garden';
    const statusCode = 301;
    return Response.redirect(destinationURL.toString(), statusCode);
  }
};
