import { Redis } from 'ioredis';

export type RedisStorage = Redis;

export function connectRedis(url: string): Redis {
  const redis = new Redis(url);
  return redis;
}
