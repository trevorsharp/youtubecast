import NodeCache from 'node-cache';
import { Redis } from '@upstash/redis';

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : undefined;

const cache = new NodeCache({ checkperiod: 120 });

const get = async <T>(key: string) => {
  if (redis) {
    return await redis.get<T>(key);
  }

  return cache.get<T>(key);
};

const set = async <T>(key: string, value: T, ttl: number) => {
  if (redis) {
    return (await redis.set<T>(key, value, { ex: ttl })) !== null;
  }

  return cache.set<T>(key, value, ttl);
};

const del = async (key: string | string[]) => {
  if (redis) {
    return await redis.del(...(typeof key === 'string' ? [key] : key));
  }

  return cache.del(key);
};

const cacheService = { get, set, del };

export default cacheService;
