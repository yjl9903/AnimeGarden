import { EventEmitter } from 'node:events';

import { describe, expect, it, vi } from 'vitest';

import { System } from '../src/system/system.ts';

class UnavailableRedis extends EventEmitter {
  public subscribe = vi.fn((_channel: string, cb: (error?: Error) => void) => {
    cb(new Error('Redis unavailable'));
  });

  public publish = vi.fn(async () => 0);

  public disconnect = vi.fn();
}

describe('System Redis initialization', () => {
  it('does not block system initialization when Redis is unavailable', async () => {
    const system = new System();
    system.redis = new UnavailableRedis() as any;
    system.publisherRedis = new UnavailableRedis() as any;

    await expect(system.initialize()).resolves.toBeUndefined();

    await system.close();
  });
});
