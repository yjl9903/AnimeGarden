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
