import { Router } from 'itty-router';

import type { Env } from './types';

import { makeDatabase } from './database';
import { handleScheduled } from './scheduled';

const router = Router();

router.get('/', () => makeResponse({ message: 'This is AnimeGarden' }));

router.get('/resources', async (request, env: Env) => {
  const database = makeDatabase(env.database);
  const params = request.query;
  return makeResponse({});
});

router.get('/users', async (request, env: Env) => {
  const database = makeDatabase(env.database);
  const users = await database.selectFrom('user').selectAll().execute();
  return makeResponse({ users });
});

router.get('/teams', async (request, env: Env) => {
  const database = makeDatabase(env.database);
  const teams = await database.selectFrom('team').selectAll().execute();
  return makeResponse({ teams });
});

router.all('*', () => makeResponse({ status: 'error', message: '404 NOT FOUND' }, { status: 404 }));

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return router.handle(request, env, ctx);
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleScheduled(event, env, ctx));
  }
};

function makeResponse(body: Object, init?: ResponseInit) {
  return new Response(JSON.stringify({ status: 'ok', ...body }), {
    ...init,
    headers: { ...init?.headers, 'Content-Type': 'application/json;charset=utf-8' }
  });
}
