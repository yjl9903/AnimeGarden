import { createConsola } from 'consola';

import { Redis } from 'ioredis';

const logger = createConsola().withTag('Redis');

export function connectRedis(url: string) {
  const redis = new Redis(url);
  return redis;
}

export async function subscribeRedisChannel(redis: Redis, sub: string) {
  return await new Promise<void>((res, rej) => {
    redis.subscribe(sub, (err) => {
      if (err) {
        logger.error(`Failed to subscribe ${sub}: ${err.message}`);
        rej();
      } else {
        logger.success(`Subscribe to ${sub} OK`);
        res();
      }
    });
  });
}

export function makeChannelMessageBus(redis: Redis) {
  const listeners = new Map<string, Set<(payload: unknown) => void | Promise<void>>>();

  redis.on('message', async (channel, message) => {
    const cbs = listeners.get(channel);
    if (cbs) {
      try {
        const msg = JSON.parse(message);
        for (const fn of cbs) {
          try {
            await fn(msg);
          } catch (error) {
            logger.error(error);
          }
        }
      } catch (error) {
        logger.error(error);
      }
    } else {
      logger.warn(`Receive message from ${channel}`);
      logger.warn(message);
    }
  });

  return {
    addListener: <T>(channel: string, fn: (payload: T) => void | Promise<void>) => {
      if (!listeners.has(channel)) listeners.set(channel, new Set());
      const set = listeners.get(channel)!;
      set.add(fn as any);
    },
    removeListener: <T>(channel: string, fn: (payload: T) => void | Promise<void>) => {
      if (!listeners.has(channel)) return;
      const set = listeners.get(channel)!;
      set.delete(fn as any);
    }
  };
}
