import NodeCache from 'node-cache';
import configService from './configService';

const cache = new NodeCache({ checkperiod: 120 });

const withCache =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <TFunc extends (...args: any[]) => Promise<any>>(
      { cacheKey, ttl }: { cacheKey: string; ttl?: number },
      func: TFunc,
    ) =>
    async (...args: Parameters<TFunc>): Promise<Awaited<ReturnType<TFunc>>> => {
      const fullCacheKey = `${cacheKey}${args.length > 0 ? '-' : ''}${args.join('-')}`;

      const cacheResult = cache.get<Awaited<ReturnType<TFunc>>>(fullCacheKey);

      if (cacheResult) {
        return cacheResult;
      }

      const result = await func(...args);

      if (result) {
        const timeToLive = ttl ?? (await configService.getConfig()).cacheTimeToLive;
        cache.set(fullCacheKey, result, timeToLive);
      }

      return result;
    };

export default { withCache };
