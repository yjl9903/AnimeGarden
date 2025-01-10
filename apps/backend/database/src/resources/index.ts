import type { System } from '../system/system';

import { Module } from '../system/module';

export class ResourcesModule extends Module<System['modules']> {
  public static name = 'resources';

  public async initialize() {
    this.system.logger.info('Initializing Resources module');
    this.system.logger.success('Initialize Resources module OK');
  }
}
