import type { Hono } from 'hono';

import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

import { System } from '@animegarden/database';

import { Server, type ServerOptions } from './app';
import { Executor, type ExecutorOptions } from './cron';

import { defineUsersRoutes } from './routes/users';
import { defineSubjectsRoutes } from './routes/subjects';
import { defineResourcesRoutes } from './routes/resources';
import { defineCollectionsRoutes } from './routes/collections';
import { defineAdminRoutes } from './routes/admin';

export * from './app';

export * from './cron';

export * from './rss';

function registerHono(sys: System, app: Hono) {
  app.use('*', cors());
  app.use('*', prettyJSON());
  app.use(
    '*',
    logger((message: string, ...rest: string[]) => {
      return sys.logger.info(message, ...rest);
    })
  );

  app.get('/', async (c) => {
    const timestamp = sys.modules.providers.timestamp;
    return c.json({
      message: 'Anime Garden 動漫花園 镜像站 / 动画 BT 资源聚合站',
      timestamp: new Date(timestamp).toISOString(),
      providers: Object.fromEntries(sys.modules.providers.providers)
    });
  });

  // Bind routes
  defineUsersRoutes(sys, app);
  defineSubjectsRoutes(sys, app);
  defineResourcesRoutes(sys, app);
  defineCollectionsRoutes(sys, app);
  defineAdminRoutes(sys, app);

  // Handle errors
  app.onError((err, c) => {
    sys.logger.error(err);

    c.status(500);

    return c.json({ status: 'ERROR' });
  });

  process.on('uncaughtException', (err) => {
    sys.logger.error(err);
  });

  process.on('unhandledRejection', (err) => {
    sys.logger.error(err);
  });

  return app;
}

export async function makeServer(sys: System, options: ServerOptions) {
  const server = new Server(sys);

  registerHono(sys, server.hono);

  return server;
}

export async function makeExecutor(sys: System, options: ExecutorOptions) {
  const executor = new Executor(sys);

  registerHono(sys, executor.hono);

  return executor;
}
