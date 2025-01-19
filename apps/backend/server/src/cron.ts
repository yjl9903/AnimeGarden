import { Hono } from 'hono';
import { Cron } from 'croner';

import { System } from '@animegarden/database';

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

    const c1 = Cron(`*/5 * * * *`, { timezone: 'Asia/Shanghai', protect: true }, async () => {
      this.system.logger.info(`Start fetching resources`);
      const tasks = [
        (async () => {
          try {
            const req = new Request(`https://api.animes.garden/admin/resources/dmhy`, {
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
        })(),
        (async () => {
          try {
            const req = new Request(`https://api.animes.garden/admin/resources/moe`, {
              method: 'POST',
              headers: {
                authorization: `Bearer ${this.system.secret}`
              }
            });
            const res = await this.hono.fetch(req);
            const out = res.json();
            this.system.logger.success(out);
          } catch (error) {
            this.system.logger.error(error);
          }
        })(),
        (async () => {
          try {
            const req = new Request(`https://api.animes.garden/admin/resources/ani`, {
              method: 'POST',
              headers: {
                authorization: `Bearer ${this.system.secret}`
              }
            });
            const res = await this.hono.fetch(req);
            const out = res.json();
            this.system.logger.success(out);
          } catch (error) {
            this.system.logger.error(error);
          }
        })()
      ];
      await Promise.all(tasks);
      this.system.logger.success(`Finish fetching resources`);
    });

    const c2 = Cron(`0 * * * *`, { timezone: 'Asia/Shanghai', protect: true }, async () => {
      this.system.logger.info(`Start updating resources`);
      const tasks = [
        (async () => {
          try {
            const req = new Request(`https://api.animes.garden/admin/resources/dmhy/sync`, {
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
        })(),
        (async () => {
          try {
            const req = new Request(`https://api.animes.garden/admin/resources/moe/sync`, {
              method: 'POST',
              headers: {
                authorization: `Bearer ${this.system.secret}`
              }
            });
            const res = await this.hono.fetch(req);
            const out = res.json();
            this.system.logger.success(out);
          } catch (error) {
            this.system.logger.error(error);
          }
        })(),
        (async () => {
          try {
            const req = new Request(`https://api.animes.garden/admin/resources/ani/sync`, {
              method: 'POST',
              headers: {
                authorization: `Bearer ${this.system.secret}`
              }
            });
            const res = await this.hono.fetch(req);
            const out = res.json();
            this.system.logger.success(out);
          } catch (error) {
            this.system.logger.error(error);
          }
        })()
      ];
      await Promise.all(tasks);
      this.system.logger.success(`Finish updating resources`);
    });

    this.disposables.push(() => c1.stop());
    this.disposables.push(() => c2.stop());
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
