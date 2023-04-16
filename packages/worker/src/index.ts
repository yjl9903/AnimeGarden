import { Router } from 'itty-router';

import type { Env } from './types';

import { makePrisma } from './prisma';
import { queryResources, searchResources } from './query';
import { handleScheduled } from './scheduled';
import { getRefreshTimestamp } from './state';
import { makeErrorResponse, makeResponse } from './utils';

const router = Router();

router.get('/', async (_request, req: Request, env: Env) =>
  makeResponse({ message: 'This is AnimeGarden', timestamp: await getRefreshTimestamp(env) })
);

router.get('/resources', async (_request, req: Request, env: Env) => {
  return queryResources(_request, req, env);
});

router.get('/resources/search', async (_request, req: Request, env: Env) => {
  return searchResources(_request, req, env);
});

router.post('/resources/search', async (_request, req: Request, env: Env) => {
  return searchResources(_request, req, env);
});

router.put('/resources', async (_request, req: Request, env: Env) => {
  try {
    return makeResponse(await handleScheduled(env));
  } catch (error) {
    console.log(error);
    return makeErrorResponse({}, { status: 400 });
  }
});

router.get('/users', async (_request, req: Request, env: Env) => {
  const prisma = makePrisma(env);
  const users = await prisma.user.findMany();
  return makeResponse({ users });
});

router.get('/teams', async (_request, req: Request, env: Env) => {
  const prisma = makePrisma(env);
  const teams = await prisma.team.findMany();
  return makeResponse({ teams });
});

router.all('*', () => makeErrorResponse({ message: '404 NOT FOUND' }, { status: 404 }));

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return router.handle(request, request, env, ctx);
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleScheduled(env));
  }
};
