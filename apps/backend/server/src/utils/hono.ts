import type { Hono } from 'hono';

import type { System } from '@animegarden/database';

export function defineHandler(handler: (system: System, app: Hono) => Hono) {
  return handler;
}
