import { Router } from 'itty-router';
import { createCors } from 'itty-cors';

import type { Env } from './types';

import { makePrisma } from './prisma';
import { handleScheduled } from './scheduled';
import { getRefreshTimestamp } from './state';
import { makeErrorResponse, makeResponse } from './utils';
import { queryResourceDetail, queryResources, searchResources } from './query';

const router = Router();

const { preflight, corsify } = createCors();

router.all('*', (_request, req: Request) => preflight(req));

router.get('/', async (_request, _req: Request, env: Env) =>
  makeResponse({ message: 'This is AnimeGarden', timestamp: await getRefreshTimestamp(env) })
);

router.get('/resources', async (request, req: Request, env: Env) => {
  return queryResources(request, req, env);
});

router.get('/resource/:href', async (request, req: Request, env: Env) => {
  return queryResourceDetail(request, req, env);
});

router.get('/resources/search', async (request, req: Request, env: Env) => {
  return searchResources(request, req, env);
});

router.post('/resources/search', async (request, req: Request, env: Env) => {
  return searchResources(request, req, env);
});

router.put('/resources', async (_request, _req: Request, env: Env) => {
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
    return router
      .handle(request, request, env, ctx)
      .catch(() => makeErrorResponse({ message: 'Interal Error' }, { status: 500 }))
      .then(corsify);
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleScheduled(env));
  }
};
