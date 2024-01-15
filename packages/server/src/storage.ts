import { connectRedis } from '@animegarden/database';

export const REDIS_URI = process.env.REDIS_URI;

if (!REDIS_URI) {
  console.log(`Can not find redis connection string`);
  process.exit(1);
}

export const storage = connectRedis(REDIS_URI);
