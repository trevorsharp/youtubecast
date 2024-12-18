import NodeCache from 'node-cache';

const cache = new NodeCache({ checkperiod: 120 });

const get = async <T>(key: string) => {
  return new Promise<T | undefined>((resolve) => resolve(cache.get<T>(key)));
};

const set = async <T>(key: string, value: T, ttl: number) => {
  return new Promise<boolean>((resolve) => resolve(cache.set<T>(key, value, ttl)));
};

const cacheService = { get, set };
export default cacheService;
