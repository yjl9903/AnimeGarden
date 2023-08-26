import { Kysely } from 'kysely';
import { PlanetScaleDialect } from 'kysely-planetscale';

import type { Env } from '../types';

import type { DB } from './types';

export * from './types';

export function connect(env: Env): Kysely<DB> {
  return new Kysely<DB>({
    dialect: new PlanetScaleDialect({
      host: env.DATABASE_HOST,
      username: env.DATABASE_USERNAME,
      password: env.DATABASE_PASSWORD,
      fetch: (url, init) => {
        if (init) {
          delete init['cache'];
        }
        return fetch(url, init);
      }
    })
  });
}
