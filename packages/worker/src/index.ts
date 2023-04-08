import { Router } from 'itty-router';

import type { Env } from './types';

import { makeDatabase } from './database';

const router = Router();

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
  }
};

function makeResponse(body: Object, init?: ResponseInit) {
  return new Response(JSON.stringify({ ...body, status: 'ok' }), {
    ...init,
    headers: { ...init?.headers, 'Content-Type': 'application/json;charset=utf-8' }
  });
}
