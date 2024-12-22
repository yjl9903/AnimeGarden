import { breadc } from 'breadc';

import { version } from '../package.json';

export const app = breadc('animegarden-manager', { version, plugins: [{ onPreCommand(ctx) {} }] })
  .option('--postgres-uri <string>', 'Postgres database connection URI')
  .option('--redis-uri <string>', 'Redis connection URI');
