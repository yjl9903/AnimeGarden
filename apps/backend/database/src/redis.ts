import redisDriver from 'unstorage/drivers/redis';
import { type Storage, type StorageValue, createStorage } from 'unstorage';

export type RedisStorage = Storage<StorageValue>;

export function connectRedis(url: string): Storage<StorageValue> {
  return createStorage({
    driver: redisDriver({
      base: 'unstorage',
      url
    })
  });
}

export async function updateRefreshTimestamp(storage: RedisStorage, now = new Date()) {
  try {
    await storage.setItem(`state/refresh-timestamp`, now.toISOString());
  } finally {
    return now;
  }
}

export async function getRefreshTimestamp(storage: RedisStorage) {
  const res = (await storage.getItem('state/refresh-timestamp')) ?? 0;
  return new Date(res as string | number);
}
