import type { System } from '../system/system';

import { Module } from '../system/module';

export class TagsModule extends Module<System['modules']> {
  public static name = 'tags';

  public async initialize() {
    // this.system.logger.info('Initializing Tags module');
    // this.system.logger.success('Initialize Tags module OK');
  }

  public async refresh() {
    // this.system.logger.info('Refreshing Tags module');
    // this.system.logger.success('Refresh Tags module OK');
  }

  public async importFromAnipar() {}
}
