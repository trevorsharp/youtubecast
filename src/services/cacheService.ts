import { Redis } from '@upstash/redis';
import { unstable_cache } from 'next/cache';
import NodeCache from 'node-cache';
import { env } from '~/env';

const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
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

/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

const withCache =
  <TFunc extends (...args: any[]) => Promise<any>>(
    { cacheKey, ttl }: { cacheKey: string; ttl: number },
    func: TFunc,
  ) =>
  async (...args: Parameters<TFunc>): Promise<Awaited<ReturnType<TFunc>>> => {
    const fullCacheKey = `${cacheKey}${args.length > 0 ? '-' : ''}${args.join('-')}`;

    if (env.USE_UNSTABLE_CACHE) {
      return await unstable_cache(() => func(...args), [fullCacheKey], { revalidate: ttl })();
    }

    const cacheResult = await get<Awaited<ReturnType<TFunc>>>(fullCacheKey);

    if (cacheResult) return cacheResult;

    const result = await func(...args);

    if (result) await set<Awaited<ReturnType<TFunc>>>(fullCacheKey, result, ttl);

    return result;
  };

export { withCache };
