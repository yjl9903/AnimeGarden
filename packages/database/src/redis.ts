import { createStorage } from 'unstorage';
import redisDriver from 'unstorage/drivers/redis';

export function connectRedis(url: string) {
  return createStorage({
    driver: redisDriver({
      base: 'unstorage',
      url
    })
  });
}
