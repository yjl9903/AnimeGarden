import { Hono } from 'hono';
import { Cron } from 'croner';

import { SupportProviders, System } from '@animegarden/database';

export interface ExecutorOptions {}

export class Executor {
  public readonly system: System;

  public readonly hono: Hono;

  private readonly disposables: Array<() => void> = [];

  public constructor(system: System) {
    this.system = system;
    this.hono = new Hono();
  }

  public async start() {
    this.system.logger.info('Start running cron jobs');

    const fetching = Cron(`*/5 * * * *`, { timezone: 'Asia/Shanghai', protect: true }, async () => {
      this.system.logger.info(`Start fetching resources`);
      const tasks = SupportProviders.map(async (provider) => {
        try {
          const req = new Request(`https://api.animes.garden/admin/resources/${provider}`, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${this.system.secret}`
            }
          });
          const res = await this.hono.fetch(req);
          const out = await res.json();
          this.system.logger.success(out);
        } catch (error) {
          this.system.logger.error(error);
        }
      });
      await Promise.all(tasks);
      this.system.logger.success(`Finish fetching resources`);
    });

    const syncing = Cron(`0 * * * *`, { timezone: 'Asia/Shanghai', protect: true }, async () => {
      this.system.logger.info(`Start updating resources`);
      const tasks = SupportProviders.map(async (provider) => {
        try {
          const req = new Request(`https://api.animes.garden/admin/resources/${provider}/sync`, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${this.system.secret}`
            }
          });
          const res = await this.hono.fetch(req);
          const out = await res.json();
          this.system.logger.success(out);
        } catch (error) {
          this.system.logger.error(error);
        }
      });
      await Promise.all(tasks);
      this.system.logger.success(`Finish updating resources`);
    });

    this.disposables.push(() => fetching.stop());
    this.disposables.push(() => syncing.stop());
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
