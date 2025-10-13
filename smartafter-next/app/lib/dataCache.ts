'use client';

// High-performance data cache with TTL and LRU eviction
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  maxAge?: number; // Maximum age in milliseconds
}

class DataCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];
  private readonly defaultTTL: number;
  private readonly maxSize: number;
  private readonly maxAge: number;

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.maxSize = options.maxSize || 100;
    this.maxAge = options.maxAge || 30 * 60 * 1000; // 30 minutes max age
  }

  set(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const entryTTL = ttl || this.defaultTTL;

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.remove(key);
    }

    // Check if we need to evict entries
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    // Add new entry
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl: entryTTL,
      accessCount: 1,
      lastAccessed: now
    });

    // Add to access order
    this.accessOrder.push(key);
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();

    // Check if entry has expired
    if (now - entry.timestamp > entry.ttl) {
      this.remove(key);
      return null;
    }

    // Check if entry is too old
    if (now - entry.timestamp > this.maxAge) {
      this.remove(key);
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = now;

    // Move to end of access order (most recently used)
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
      this.accessOrder.push(key);
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  remove(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  size(): number {
    return this.cache.size;
  }

  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    // Remove least recently used entry
    const lruKey = this.accessOrder[0];
    this.remove(lruKey);
  }

  // Clean up expired entries
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl || now - entry.timestamp > this.maxAge) {
        this.remove(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.values());
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      expired: entries.filter(e => now - e.timestamp > e.ttl).length,
      old: entries.filter(e => now - e.timestamp > this.maxAge).length,
      avgAccessCount: entries.reduce((sum, e) => sum + e.accessCount, 0) / entries.length || 0
    };
  }
}

// Global cache instances for different data types
export const routeDataCache = new DataCache({
  ttl: 2 * 60 * 1000, // 2 minutes
  maxSize: 50,
  maxAge: 10 * 60 * 1000 // 10 minutes
});

export const apiResponseCache = new DataCache({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,
  maxAge: 30 * 60 * 1000 // 30 minutes
});

export const userDataCache = new DataCache({
  ttl: 10 * 60 * 1000, // 10 minutes
  maxSize: 20,
  maxAge: 60 * 60 * 1000 // 1 hour
});

// Cache key generators
export const cacheKeys = {
  route: (path: string) => `route:${path}`,
  api: (endpoint: string, params?: Record<string, any>) => 
    `api:${endpoint}:${params ? JSON.stringify(params) : 'default'}`,
  user: (userId: string, dataType: string) => `user:${userId}:${dataType}`,
  dashboard: (userId: string, days: number) => `dashboard:${userId}:${days}d`,
  purchases: (userId: string, filters?: any) => `purchases:${userId}:${JSON.stringify(filters || {})}`,
  documents: (userId: string, filters?: any) => `documents:${userId}:${JSON.stringify(filters || {})}`,
  warranties: (userId: string, filters?: any) => `warranties:${userId}:${JSON.stringify(filters || {})}`
};

// High-performance cache wrapper for API calls
export async function withCache<T>(
  cache: DataCache<T>,
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try to get from cache first
  const cached = cache.get(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  try {
    const data = await fetcher();
    cache.set(key, data, ttl);
    return data;
  } catch (error) {
    console.error('Cache fetch error:', error);
    throw error;
  }
}

// Batch cache operations
export async function batchCacheGet<T>(
  cache: DataCache<T>,
  keys: string[]
): Promise<Map<string, T | null>> {
  const results = new Map<string, T | null>();
  
  for (const key of keys) {
    results.set(key, cache.get(key));
  }
  
  return results;
}

export function batchCacheSet<T>(
  cache: DataCache<T>,
  entries: Array<{ key: string; data: T; ttl?: number }>
): void {
  for (const entry of entries) {
    cache.set(entry.key, entry.data, entry.ttl);
  }
}

// Cache warming for critical routes
export async function warmCache(userId: string): Promise<void> {
  const warmingPromises = [
    // Warm dashboard cache
    fetch('/api/dashboard?ssr=true&cache=true').then(res => res.json()),
    
    // Warm major route caches
    fetch('/api/purchases/fast?cache=true').then(res => res.json()),
    fetch('/api/documents/fast?cache=true').then(res => res.json()),
    fetch('/api/warranties/fast?cache=true').then(res => res.json())
  ];

  try {
    const [dashboard, purchases, documents, warranties] = await Promise.allSettled(warmingPromises);
    
    // Cache successful responses
    if (dashboard.status === 'fulfilled') {
      routeDataCache.set(cacheKeys.dashboard(userId, 7), dashboard.value);
    }
    
    if (purchases.status === 'fulfilled') {
      apiResponseCache.set(cacheKeys.purchases(userId), purchases.value);
    }
    
    if (documents.status === 'fulfilled') {
      apiResponseCache.set(cacheKeys.documents(userId), documents.value);
    }
    
    if (warranties.status === 'fulfilled') {
      apiResponseCache.set(cacheKeys.warranties(userId), warranties.value);
    }
    
    console.log('🔥 Cache warmed successfully');
  } catch (error) {
    console.warn('Cache warming failed:', error);
  }
}

// Periodic cache cleanup
export function startCacheCleanup(): void {
  setInterval(() => {
    const cleaned = routeDataCache.cleanup() + 
                   apiResponseCache.cleanup() + 
                   userDataCache.cleanup();
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired cache entries`);
    }
  }, 60000); // Clean up every minute
}

// Initialize cache cleanup on client side
if (typeof window !== 'undefined') {
  startCacheCleanup();
}
