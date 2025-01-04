import type { System } from '../system/system';

import { Module } from '../system/module';

export class ResoucresModule extends Module<System['modules']> {
  public static name = 'resources';

  public async initialize() {}
}
