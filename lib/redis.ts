import Redis from 'ioredis';

// Redis client configuration with fallback to in-memory cache
let redis: Redis | null = null;
let useFallback = false;

try {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 1, // Reduced retries for faster fallback
    lazyConnect: true,
    showFriendlyErrorStack: process.env.NODE_ENV === 'development',
    connectTimeout: 2000, // 2 second timeout
  });

  // Handle connection events
  redis.on('connect', () => {
    
    useFallback = false;
  });

  redis.on('error', () => {
    console.log('Redis connection error, falling back to in-memory cache');
    useFallback = true;
  });

  redis.on('close', () => {
    
    useFallback = true;
  });

} catch {
  console.log('Redis initialization failed, using in-memory cache');
  useFallback = true;
}

// Import fallback cache functions
import {
  getCachedData as getFallbackCache,
  setCachedData as setFallbackCache,
  deleteCachedData as deleteFallbackCache,
  clearAllCache as clearFallbackCache
} from './cache-fallback';

// Helper functions for caching with fallback
export async function getCachedData<T>(key: string): Promise<T | null> {
  if (useFallback || !redis) {
    return getFallbackCache<T>(key);
  }

  try {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch {
    console.log('Redis get error, falling back to in-memory cache');
    useFallback = true;
    return getFallbackCache<T>(key);
  }
}

export async function setCachedData<T>(key: string, data: T, ttlSeconds: number = 300): Promise<void> {
  if (useFallback || !redis) {
    return setFallbackCache<T>(key, data, ttlSeconds);
  }

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
  } catch {
    console.log('Redis set error, falling back to in-memory cache');
    useFallback = true;
    await setFallbackCache<T>(key, data, ttlSeconds);
  }
}

export async function deleteCachedData(key: string): Promise<void> {
  if (useFallback || !redis) {
    return deleteFallbackCache(key);
  }

  try {
    await redis.del(key);
    
  } catch {
    console.log('Redis delete error, falling back to in-memory cache');
    useFallback = true;
    await deleteFallbackCache(key);
  }
}

export async function clearAllCache(): Promise<void> {
  if (useFallback || !redis) {
    return clearFallbackCache();
  }

  try {
    await redis.flushdb();
    
  } catch {
    console.log('Redis clear error, falling back to in-memory cache');
    useFallback = true;
    await clearFallbackCache();
  }
}

export default redis;
