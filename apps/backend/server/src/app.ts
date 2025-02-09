import { Hono } from 'hono';
import { serve } from '@hono/node-server';

import type { System } from '@animegarden/database';

export interface ServerOptions {}

export interface ListenOptions {
  host?: string;

  port?: string | number;
}

export class Server {
  public readonly system: System;

  public readonly hono: Hono;

  public constructor(system: System) {
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
      });
    });
  }
}
