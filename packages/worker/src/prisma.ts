import { PrismaClient } from '@prisma/client/edge';

import type { Env } from './types';

let client: PrismaClient;
export function makePrisma(env: Env): PrismaClient {
  if (client) {
    return client;
  } else {
    return (client = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } }));
  }
}
