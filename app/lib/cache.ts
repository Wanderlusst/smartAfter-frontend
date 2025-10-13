// Enhanced in-memory cache for API responses with aggressive caching
// In production, you should use Redis or a proper caching service

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 2 * 60 * 1000; // 2 minutes for real-time data
  private readonly LONG_TTL = 10 * 60 * 1000; // 10 minutes for semi-static data
  private readonly BACKGROUND_TTL = 5 * 60 * 1000; // 5 minutes for background refreshes
  private readonly VERSION = 'v3'; // Cache version for invalidation
  private hits = 0;
  private misses = 0;

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      version: this.VERSION,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry || entry.version !== this.VERSION) {
      this.misses++;
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  // Delete all keys matching a pattern
  deletePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  // Clear expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl || entry.version !== this.VERSION) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats(): { size: number; keys: string[]; hitRate: number; hits: number; misses: number } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
      hits: this.hits,
      misses: this.misses
    };
  }

  // Create cache key for user-specific data
  createUserKey(userId: string, resource: string): string {
    return `user:${userId}:${resource}`;
  }

  // Create cache key for general data
  createKey(...parts: string[]): string {
    return parts.join(':');
  }

  // Get TTL based on resource type
  getTTL(resource: string): number {
    switch (resource) {
      case 'dashboard-initial':
      case 'purchases':
      case 'warranties':
      case 'refunds':
        return this.LONG_TTL; // 1 hour for main data
      case 'documents':
        return this.DEFAULT_TTL; // 30 minutes for documents
      default:
        return this.DEFAULT_TTL;
    }
  }
}

// Global cache instance
export const apiCache = new ApiCache();

// Helper function to get or set cached data with aggressive caching
export async function getCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = apiCache.get<T>(key);
  
  if (cached !== null) {
    
    return cached;
  }

  const data = await fetchFn();
  apiCache.set(key, data, ttl);
  return data;
}

// Helper function for user-specific cached data with longer TTL
export async function getCachedUserData<T>(
  userId: string,
  resource: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const key = apiCache.createUserKey(userId, resource);
  const defaultTTL = ttl || apiCache.getTTL(resource);
  return getCachedData(key, fetchFn, defaultTTL);
}

// Preload critical data for faster initial loads
export async function preloadUserData(userId: string) {
  const resources = ['dashboard-initial', 'purchases', 'warranties'];
  
  for (const resource of resources) {
    const key = apiCache.createUserKey(userId, resource);
    if (!apiCache.has(key)) {
      
      // This will be populated when the user actually visits the page
    }
  }
}

// Clean up expired entries periodically
if (typeof window === 'undefined') {
  // Only run cleanup on server side
  // DISABLED: Background cache cleanup to prevent background processing
  // setInterval(() => {
  //   apiCache.cleanup();
  // }, 5 * 60 * 1000); // Cleanup every 5 minutes (reduced from 10 minutes)
}

export default apiCache; 