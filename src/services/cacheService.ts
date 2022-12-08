import NodeCache from 'node-cache';

const cache = new NodeCache({ checkperiod: 120 });

const get = async <T>(key: string) => cache.get<T>(key);
const set = async <T>(key: string, value: T, ttl: number) => cache.set<T>(key, value, ttl);
const del = async (key: string | string[]) => cache.del(key);

const cacheService = { get, set, del };

export default cacheService;
