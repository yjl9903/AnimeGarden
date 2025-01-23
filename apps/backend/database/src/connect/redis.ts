import { Redis } from 'ioredis';

export function connectRedis(url: string) {
  const redis = new Redis(url);
  return redis;
}
