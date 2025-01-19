import { type Storage, type StorageValue, createStorage } from 'unstorage';
import redisDriver from 'unstorage/drivers/redis';

export type RedisStorage = Storage<StorageValue>;

export function connectRedis(url: string): Storage<StorageValue> {
  return createStorage({
    driver: redisDriver({
      base: 'unstorage',
      url
    })
  });
}
