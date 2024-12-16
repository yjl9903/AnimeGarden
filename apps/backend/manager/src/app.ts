import { breadc } from 'breadc';

import { version } from '../package.json';

export const app = breadc('manager', { version })
  .option('--postgres-uri <string>', 'Postgres database connection URI')
  .option('--redis-uri <string>', 'Redis connection URI');

