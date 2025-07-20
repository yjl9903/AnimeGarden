import { Hono } from 'hono';
import { Cron } from 'croner';

import { SupportProviders } from '@animegarden/client';

import type { System } from '../system';

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

    // const syncing = SupportProviders.map(
    //   (provider) =>
    //     new Cron(`0 * * * *`, { timezone: 'Asia/Shanghai', protect: true }, async () => {
    //       try {
    //         const req = new Request(`https://api.animes.garden/admin/resources/${provider}/sync`, {
    //           method: 'POST',
    //           headers: {
    //             authorization: `Bearer ${this.system.secret}`
    //           }
    //         });
    //         const res = await this.hono.fetch(req);
    //         await res.json();
    //       } catch (error) {
    //         this.system.logger.error(error);
    //       }
    //     })
    // );
    const syncing: any[] = [];

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
