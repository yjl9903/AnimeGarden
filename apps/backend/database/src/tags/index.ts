import type { System } from '../system/system';

import { Module } from '../system/module';

export class TagsModule extends Module<System['modules']> {
  public static name = 'tags';

  public async initialize() {
    // this.system.logger.info('Initializing Tags module');
    // this.system.logger.success('Initialize Tags module OK');
  }

  public async importFromAnipar() {}
}
