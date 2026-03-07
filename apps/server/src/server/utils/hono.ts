import type { Hono } from 'hono';

import type { System } from '../../system';

export type AppVariables = {
  requestId: string;

  responseTimestamp: Date | undefined | null;
};

export type AppEnv = {
  Bindings: {};

  Variables: AppVariables;
};

export function defineHandler(handler: (system: System, app: Hono<AppEnv>) => Hono<AppEnv>) {
  return handler;
}
