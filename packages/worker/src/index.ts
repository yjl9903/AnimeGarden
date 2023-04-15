import { Router } from 'itty-router';

import type { Env } from './types';

import { makePrisma } from './prisma';
import { handleScheduled } from './scheduled';
import { getRefreshTimestamp } from './state';

const router = Router();

router.get('/', async (request, env: Env) =>
  makeResponse({ message: 'This is AnimeGarden', timestamp: await getRefreshTimestamp(env) })
);

router.get('/resources', async (request, env: Env) => {
  const prisma = makePrisma(env);

  const params = resolveParams();
  if (!params) {
    return makeErrorResponse({ message: 'Request is not valid' });
  }
  const { page, pageSize, fansub, publisher, type, before, after } = params;

  const plan = await prisma.resource.findMany({
    where: {
      type,
      fansubId: fansub,
      publisherId: publisher,
      createdAt: {
        gte: after?.getTime(),
        lte: before?.getTime()
      }
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      fansub: true,
      publisher: true,
      anitomy: true
    }
  });

  const resources = plan.map((r) => ({
    title: r.title,
    href: r.href,
    type: r.type,
    magnet: r.magnet,
    size: r.size,
    createdAt: new Date(Number(r.createdAt)),
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

  return makeResponse({ resources, timestamp: await getRefreshTimestamp(env) });

  function resolveParams():
    | {
        page: number;
        pageSize: number;
        fansub: number | undefined;
        publisher: number | undefined;
        type: string | undefined;
        before: Date | undefined;
        after: Date | undefined;
      }
    | undefined {
    let page = readNum(request.query.page || '1');
    let pageSize = readNum(request.query.count || '100');
    const fansub = request.query.fansub ? readNum(request.query.fansub) : undefined;
    const publisher = request.query.publisher ? readNum(request.query.publisher) : undefined;
    const type = typeof request.query.type === 'string' ? request.query.type : undefined;

    if (!page || !pageSize) return undefined;
    if (page <= 0) page = 1;
    if (pageSize <= 0) pageSize = 100;
    if (pageSize > 100) pageSize = 100;

    const before = readDate(request.query.before);
    const after = readDate(request.query.after);

    return { page, pageSize, fansub, publisher, type, before, after };

    function readNum(raw: string | string[]) {
      if (typeof raw === 'string' && /^\d+$/.test(raw)) {
        return +raw;
      } else {
        return undefined;
      }
    }

    function readDate(raw: string | string[] | undefined) {
      if (typeof raw === 'string') {
        const d = new Date(raw);
        return !isNaN(d.getTime()) ? d : undefined;
      } else {
        return undefined;
      }
    }
  }
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
