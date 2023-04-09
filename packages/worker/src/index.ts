import { Router } from 'itty-router';

import type { Env } from './types';

import { handleScheduled } from './scheduled';
import { makePrisma } from './prisma';

const router = Router();

router.get('/', () => makeResponse({ message: 'This is AnimeGarden' }));

router.get('/resources', async (request, env: Env) => {
  const prisma = makePrisma(env);

  const params = resolveParams();
  if (!params) {
    return makeErrorResponse({ message: 'Request is not valid' });
  }
  const { page, pageSize } = params;

  const plan = await prisma.resource.findMany({
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      fansub: true,
      publisher: true
    }
  });

  const resources = plan.map((r) => ({
    title: r.title,
    href: r.href,
    type: r.type,
    magnet: r.magnet,
    size: r.size,
    createdAt: new Date(r.createdAt),
    fansub: r.fansub
      ? {
          id: r.fansub.id,
          name: r.fansub.name,
          href: `https://share.dmhy.org/topics/list/team_id/${r.fansub.id}`
        }
      : undefined,
    publisher: {
      id: r.publisher.id,
      name: r.publisher.name,
      href: `https://share.dmhy.org/topics/list/user_id/${r.publisher.id}`
    }
  }));

  return makeResponse({ resources });

  function resolveParams(): { page: number; pageSize: number } | undefined {
    let page = readNum(request.params.page || '1');
    let pageSize = readNum(request.params.count || '1');
    if (!page || !pageSize) return undefined;

    if (page <= 0) page = 1;
    if (pageSize <= 0) pageSize = 100;
    if (pageSize > 100) pageSize = 100;

    return { page, pageSize };

    function readNum(raw: string) {
      if (typeof raw === 'string' && /^\d+$/.test(raw)) {
        return +raw;
      } else {
        return undefined;
      }
    }
  }
});

router.put('/resources', async (request, env: Env) => {
  try {
    await handleScheduled(env);
    return makeResponse({});
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
