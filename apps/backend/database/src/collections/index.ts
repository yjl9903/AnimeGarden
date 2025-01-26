import type { System } from '../system';

import { Module } from '../system/module';

export class CollectionsModule extends Module<System['modules']> {
  public static name = 'collections';

  public async initialize() {}
}
