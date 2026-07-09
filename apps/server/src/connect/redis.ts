import { Redis } from 'ioredis';
import { createConsola } from 'consola';

const logger = createConsola().withTag('Redis');

const REDIS_RETRY_DELAY_MS = 10_000;

export function connectRedis(url: string) {
  const redis = new Redis(url, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: () => REDIS_RETRY_DELAY_MS
  });

  redis.on('error', (error) => {
    logger.warn(`Redis connection error: ${error.message}`);
  });

  return redis;
}

/**
 * Subscribe in the background. Failed attempts are retried so Redis stays an
 * optional dependency for service startup while ioredis handles reconnection.
 */
export function subscribeRedisChannelLoose(redis: Redis, channel: string) {
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;

  const retry = () => {
    if (stopped) return;

    logger.warn(`Retry subscribe '${channel}' in ${REDIS_RETRY_DELAY_MS / 1000}s`);
    timer = setTimeout(start, REDIS_RETRY_DELAY_MS);
    timer.unref?.();
  };

  const start = () => {
    if (stopped) return;

    try {
      redis.subscribe(channel, (error) => {
        if (!error) {
          logger.success(`Subscribe to '${channel}' OK`);
          return;
        }

        logger.error(`Failed to subscribe '${channel}': ${error.message}`);
        retry();
      });
    } catch (error) {
      logger.error(`Failed to subscribe '${channel}'`, error);
      retry();
    }
  };

  start();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

export function makeChannelMessageBus() {
  const listeners = new Map<string, Set<(payload: unknown) => void | Promise<void>>>();

  const handler = async (channel: string, message: string) => {
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
  };

  const instance = {
    logger,
    listen: (redis: Redis) => {
      redis.on('message', handler);
      return instance;
    },
    unlisten: (redis: Redis) => {
      redis.off('message', handler);
      return instance;
    },
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

  return instance;
}
