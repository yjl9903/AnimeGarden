import { PrismaClient } from '@prisma/client/edge';

import type { Env } from './types';

export function makePrisma(env: Env) {
  return new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
}
