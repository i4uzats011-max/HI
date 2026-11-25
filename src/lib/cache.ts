import Redis from 'ioredis';

// In-Memory Fallback Cache Store
interface MemoryCacheItem {
  value: string;
  expiresAt: number;
}
const memoryCache = new Map<string, MemoryCacheItem>();

// Cleanup expired items periodically from in-memory cache
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of memoryCache.entries()) {
    if (item.expiresAt < now) {
      memoryCache.delete(key);
    }
  }
}, 60000);

let redisClient: Redis | null = null;
let redisInitialized = false;
let redisAvailable = false;

function getRedisInstance(): Redis | null {
  if (redisInitialized) {
    return redisAvailable ? redisClient : null;
  }

  redisInitialized = true;
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_URI;

  if (!redisUrl) {
    console.log('[Cache] No REDIS_URL configured. Using ultra-fast in-memory cache.');
    redisAvailable = false;
    return null;
  }

  try {
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 4000,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 3) {
          console.warn('[Cache] Redis reconnect failed 3 times, falling back to in-memory.');
          return null; // stop retrying
        }
        return Math.min(times * 100, 1000);
      }
    });

    client.on('error', (err) => {
      console.warn('[Cache] Redis connection error (using fallback):', err.message);
      redisAvailable = false;
    });

    client.on('connect', () => {
      console.log('[Cache] Successfully connected to Redis server!');
      redisAvailable = true;
    });

    client.connect().catch((err) => {
      console.warn('[Cache] Initial Redis connection failed:', err.message);
      redisAvailable = false;
    });

    redisClient = client;
    return client;
  } catch (err: any) {
    console.warn('[Cache] Could not instantiate Redis:', err.message);
    redisAvailable = false;
    return null;
  }
}

/**
 * Get an item from Redis or In-Memory Cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedisInstance();

  if (client && redisAvailable) {
    try {
      const val = await client.get(key);
      if (val) {
        return JSON.parse(val) as T;
      }
      return null;
    } catch (err) {
      // Fall through to memoryCache on error
    }
  }

  // Fallback to Memory Cache
  const item = memoryCache.get(key);
  if (!item) return null;

  if (Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  try {
    return JSON.parse(item.value) as T;
  } catch {
    return null;
  }
}

/**
 * Set an item in Redis and In-Memory Cache
 * Default TTL: 300 seconds (5 minutes)
 */
export async function setCache(key: string, data: any, ttlSeconds: number = 300): Promise<void> {
  const jsonStr = JSON.stringify(data);
  const client = getRedisInstance();

  if (client && redisAvailable) {
    try {
      await client.set(key, jsonStr, 'EX', ttlSeconds);
    } catch (err) {
      // Continue to set in memory cache
    }
  }

  // Always store in memory cache for local fast lookup
  memoryCache.set(key, {
    value: jsonStr,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
}

/**
 * Invalidate a specific cache key
 */
export async function invalidateCacheKey(key: string): Promise<void> {
  memoryCache.delete(key);
  const client = getRedisInstance();
  if (client && redisAvailable) {
    try {
      await client.del(key);
    } catch (err) {
      // Ignore
    }
  }
}

/**
 * Invalidate all cache keys matching a prefix or pattern (e.g. `company:${companyId}:*`)
 */
export async function invalidateCachePattern(prefix: string): Promise<void> {
  // Clear memory cache matching prefix
  for (const k of memoryCache.keys()) {
    if (k.startsWith(prefix) || k.includes(prefix)) {
      memoryCache.delete(k);
    }
  }

  const client = getRedisInstance();
  if (client && redisAvailable) {
    try {
      const stream = client.scanStream({
        match: `${prefix}*`,
        count: 100
      });

      stream.on('data', (keys: string[]) => {
        if (keys.length) {
          const pipeline = client.pipeline();
          keys.forEach(k => pipeline.del(k));
          pipeline.exec();
        }
      });
    } catch (err) {
      // Ignore
    }
  }
}

/**
 * Invalidate all caches for a company
 */
export async function invalidateCompanyCache(companyId: string): Promise<void> {
  await invalidateCachePattern(`company:${companyId}`);
}
