import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { serve } from '@hono/node-server';
import { Cron } from 'croner';

import { System } from '../system';

import { defineUsersRoutes } from './routes/users';
import { defineSubjectsRoutes } from './routes/subjects';
import { defineResourcesRoutes } from './routes/resources';
import { defineCollectionsRoutes } from './routes/collections';
import { defineFeedRoutes } from './routes/feed';
import { defineAdminRoutes } from './routes/admin';
import { defineSitemapsRoutes } from './routes/sitemaps';
import { SupportProviders } from '@animegarden/client';
import { McpServer } from './mcp';

export * from './rss';

export * from './sitemap';

export interface ServerOptions {}

export interface ListenOptions {
  host?: string;

  port?: string | number;
}

export class Server {
  public readonly system: System;

  public readonly hono: Hono;

  public constructor(system: System, options: ServerOptions = {}) {
    this.system = system;
    this.hono = new Hono();
  }

  public async listen(options: ListenOptions) {
    const host = options.host ?? '0.0.0.0';
    const port = options.port ? +options.port : 3000;

    const server = serve(
      {
        fetch: this.hono.fetch,
        hostname: host,
        port
      },
      (info) => {
        this.system.logger.info(`Start listening on http://${info.address}:${info.port}`);
      }
    );

    return new Promise<void>((res) => {
      server.addListener('close', () => res());
      server.addListener('error', (err) => {
        this.system.logger.error(err);
        process.exit(1);
      });
    });
  }
}

export interface ExecutorOptions {}

export class Executor extends Server {
  private readonly disposables: Array<() => void> = [];

  public constructor(system: System) {
    super(system);
  }

  public async start() {
    this.system.logger.info('Start registering cron jobs');

    const fetching = SupportProviders.map(
      (provider) =>
        new Cron(`*/5 * * * *`, { timezone: 'Asia/Shanghai', protect: true }, async () => {
          try {
            const req = new Request(`https://api.animes.garden/admin/resources/${provider}`, {
              method: 'POST',
              headers: {
                authorization: `Bearer ${this.system.secret}`
              }
            });
            const res = await this.hono.fetch(req);
            await res.json();
          } catch (error) {
            this.system.logger.error(error);
          }
        })
    );

    const syncing = SupportProviders.map(
      (provider) =>
        new Cron(`0 * * * *`, { timezone: 'Asia/Shanghai', protect: true }, async () => {
          try {
            const req = new Request(`https://api.animes.garden/admin/resources/${provider}/sync`, {
              method: 'POST',
              headers: {
                authorization: `Bearer ${this.system.secret}`
              }
            });
            const res = await this.hono.fetch(req);
            await res.json();
          } catch (error) {
            this.system.logger.error(error);
          }
        })
    );

    this.disposables.push(() => {
      fetching.forEach((f) => f.stop());
      syncing.forEach((f) => f.stop());
    });

    this.system.logger.info(`Finish registering ${fetching.length + syncing.length} cron jobs`);
  }

  public async stop() {
    this.system.logger.info('Stop running cron jobs');
    for (const fn of this.disposables) {
      try {
        fn();
      } catch {}
    }
  }
}

function registerHono(sys: System, app: Hono) {
  app.use(
    '*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS']
    })
  );
  app.use('*', prettyJSON());
  app.use(
    '*',
    logger((message: string, ...rest: string[]) => {
      return sys.logger.info(message, ...rest);
    })
  );

  app.use('*', async (ctx, next) => {
    if (ctx.req.url === '/health') {
      await next();
    } else {
      await sys.initialize();
      await next();
    }
  });

  app.get('/', async (c) => {
    const timestamp = sys.modules.providers.timestamp;
    return c.json({
      status: 'OK',
      timestamp: new Date(timestamp).toISOString(),
      providers: Object.fromEntries(sys.modules.providers.providers)
    });
  });

  app.get('/health', async (c) => {
    const timestamp = sys.modules.providers.timestamp;
    return c.json({
      status: 'OK',
      timestamp: new Date(timestamp).toISOString(),
      providers: Object.fromEntries(sys.modules.providers.providers)
    });
  });

  // Bind routes
  defineUsersRoutes(sys, app);
  defineSubjectsRoutes(sys, app);
  defineResourcesRoutes(sys, app);
  defineCollectionsRoutes(sys, app);
  defineFeedRoutes(sys, app);
  defineAdminRoutes(sys, app);
  defineSitemapsRoutes(sys, app);

  // Handle errors
  app.onError((err, c) => {
    sys.logger.error(err);

    return c.json({ status: 'ERROR' }, 500);
  });

  process.on('uncaughtException', (err) => {
    sys.logger.error(err);
  });

  process.on('unhandledRejection', (err) => {
    sys.logger.error(err);
  });

  return app;
}

function registerMcp(sys: System, app: Hono) {
  const mcp = new McpServer(sys);

  app.all('/mcp', async (c) => {
    if (!mcp.mcp.isConnected()) {
      // Connect the mcp with the transport
      await mcp.mcp.connect(mcp.transport);
    }

    return mcp.transport.handleRequest(c);
  });

  return mcp;
}

export async function makeServer(sys: System, options: ServerOptions) {
  const server = new Server(sys, options);

  registerHono(sys, server.hono);
  registerMcp(sys, server.hono);

  return server;
}

export async function makeExecutor(sys: System, options: ExecutorOptions) {
  const executor = new Executor(sys);

  registerHono(sys, executor.hono);

  return executor;
}
