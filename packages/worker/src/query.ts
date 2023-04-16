import type { Resource, Team, User, Anitomy } from '@prisma/client';

import type { Env } from './types';

import { makePrisma } from './prisma';
import { getRefreshTimestamp } from './state';
import { makeErrorResponse, makeResponse } from './utils';
import { IRequest } from 'itty-router';

export async function queryResources(request: IRequest, req: Request, env: Env) {
  const prisma = makePrisma(env);

  const params = resolveQueryParams(request.query);
  if (!params) {
    return makeErrorResponse({ message: 'Request is not valid' });
  }
  const { page, pageSize, fansub, publisher, type, before, after } = params;

  const result = await prisma.resource.findMany({
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
  const resources = resolveQueryResult(result);
  return makeResponse({ resources, timestamp: await getRefreshTimestamp(env) });
}

export async function searchResources(request: IRequest, req: Request, env: Env) {
  const prisma = makePrisma(env);

  const params = resolveQueryParams(request.query);
  if (!params) {
    return makeErrorResponse({ message: 'Request is not valid' });
  }

  const { page, pageSize, fansub, publisher, type, before, after } = params;
  const { keywords } = await resolveBody(req);
  const result = await prisma.resource.findMany({
    where: {
      AND: [
        {
          type,
          fansubId: fansub,
          publisherId: publisher,
          createdAt: {
            gte: after?.getTime(),
            lte: before?.getTime()
          }
        },
        {
          AND: keywords.include.map((t) => ({ title: { contains: t } }))
        }
      ],
      NOT: keywords.exclude.map((t) => ({ title: { contains: t } }))
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
  const resources = resolveQueryResult(result);
  return makeResponse({ resources });

  async function resolveBody(request: Request) {
    try {
      const body = await request.json<{ keywords?: { include: unknown; exclude: unknown } }>();
      return {
        keywords: {
          include: getStringArray(body.keywords?.include),
          exclude: getStringArray(body.keywords?.exclude)
        }
      };
    } catch (error) {
      return {
        keywords: {
          include: [],
          exclude: []
        }
      };
    }

    function getStringArray(arr: unknown): string[] {
      if (Array.isArray(arr)) {
        return arr
          .filter((x) => typeof x === 'string')
          .map((x: string) => x.trim())
          .filter(Boolean);
      } else if (typeof arr === 'string') {
        const t = arr.trim();
        return !!t ? [t] : [];
      } else {
        return [];
      }
    }
  }
}

interface QueryParams {
  page: number;
  pageSize: number;
  fansub: number | undefined;
  publisher: number | undefined;
  type: string | undefined;
  before: Date | undefined;
  after: Date | undefined;
}

function resolveQueryParams(
  query: Record<string, string | string[] | undefined>
): QueryParams | undefined {
  let page = readNum(query.page || '1');
  let pageSize = readNum(query.count || '100');
  const fansub = query.fansub ? readNum(query.fansub) : undefined;
  const publisher = query.publisher ? readNum(query.publisher) : undefined;
  const type = typeof query.type === 'string' ? query.type : undefined;

  if (!page || !pageSize) return undefined;
  if (page <= 0) page = 1;
  if (pageSize <= 0) pageSize = 100;
  if (pageSize > 100) pageSize = 100;

  const before = readDate(query.before);
  const after = readDate(query.after);

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

function resolveQueryResult(
  result: (Resource & { fansub: Team | null; publisher: User; anitomy: Anitomy | null })[]
) {
  return result.map((r) => ({
    title: r.title,
    href: `https://share.dmhy.org/topics/view/${r.href}`,
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
}
