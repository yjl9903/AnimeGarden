import { Module, type System } from '../system';

export class ResoucresModule extends Module<System['modules']> {
  public static name = 'resources';

  public async initialize() {}
}
