import { Router } from 'itty-router';

import type { Env } from './types';

import { makeDatabase } from './database';
import { handleScheduled } from './scheduled';

const router = Router();

router.get('/', () => makeResponse({ message: 'This is AnimeGarden' }));

router.get('/resources', async (request, env: Env) => {
  const database = makeDatabase(env.database);

  const params = resolveParams();
  if (!params) {
    return makeErrorResponse({ message: 'Request is not valid' });
  }
  const { page, pageSize } = params;

  const sql = database
    .selectFrom('resource')
    .innerJoin('user', 'user.id', 'resource.publisher')
    .select([
      'title',
      'href',
      'type',
      'magnet',
      'user.id as publisher_id',
      'user.name as publisher_name',
      'createdAt'
    ])
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  const resources = (await sql.execute()).map((r) => ({
    title: r.title,
    href: r.href,
    type: r.type,
    magnet: r.magnet,
    createdAt: r.createdAt,
    publisher: {
      id: r.publisher_id,
      name: r.publisher_name
    }
  }));

  return makeResponse({ resources });

  function resolveParams(): { page: number; pageSize: number } | undefined {
    const rawPage = request.params.page || '1';
    if (!(typeof rawPage === 'string' && /^\d+$/.test(rawPage))) {
      return undefined;
    }
    const pageSize = 100;
    return { page: +rawPage, pageSize };
  }
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

router.all('*', () => makeErrorResponse({ message: '404 NOT FOUND' }, { status: 404 }));

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return router.handle(request, env, ctx);
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleScheduled(event, env, ctx));
  }
};

function makeErrorResponse(body: Object, init?: ResponseInit) {
  return new Response(JSON.stringify({ status: 'error', ...body }), {
    ...init,
    headers: { ...init?.headers, 'Content-Type': 'application/json;charset=utf-8' }
  });
}

function makeResponse(body: Object, init?: ResponseInit) {
  return new Response(JSON.stringify({ status: 'ok', ...body }), {
    ...init,
    headers: { ...init?.headers, 'Content-Type': 'application/json;charset=utf-8' }
  });
}
