import { Router } from 'itty-router';

import type { Env } from './types';

import { makePrisma } from './prisma';
import { queryResources, searchResources } from './query';
import { handleScheduled } from './scheduled';
import { getRefreshTimestamp } from './state';
import { makeErrorResponse, makeResponse } from './utils';

const router = Router();

router.get('/', async (request, env: Env) =>
  makeResponse({ message: 'This is AnimeGarden', timestamp: await getRefreshTimestamp(env) })
);

router.get('/resources', async (request, env: Env) => {
  return queryResources(request, env);
});

router.get('/resources/search', async (request, env: Env) => {
  return searchResources(request, env);
});

router.post('/resources/search', async (request, env: Env) => {
  return searchResources(request, env);
});

router.put('/resources', async (request, env: Env) => {
  try {
    return makeResponse(await handleScheduled(env));
  } catch (error) {
    console.log(error);
    return makeErrorResponse({}, { status: 400 });
  }
});

router.get('/users', async (request, env: Env) => {
  const prisma = makePrisma(env);
  const users = await prisma.user.findMany();
  return makeResponse({ users });
});

router.get('/teams', async (request, env: Env) => {
  const prisma = makePrisma(env);
  const teams = await prisma.team.findMany();
  return makeResponse({ teams });
});

router.all('*', () => makeErrorResponse({ message: '404 NOT FOUND' }, { status: 404 }));

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return router.handle(request, env, ctx);
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleScheduled(env));
  }
};
