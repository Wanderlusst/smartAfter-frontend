/**
 * Fallback in-memory cache system when Redis is not available
 * This provides basic caching functionality without external dependencies
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 300; // 5 minutes in seconds

  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        return null;
      }

      // Check if expired
      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      
      return null;
    }
  }

  async set<T>(key: string, data: T, ttlSeconds: number = this.defaultTTL): Promise<void> {
    try {
      const expiresAt = Date.now() + (ttlSeconds * 1000);
      this.cache.set(key, { data, expiresAt });

      // Clean up expired entries periodically
      this.cleanup();
    } catch (error) {
      
    }
  }

  async del(key: string): Promise<void> {
    try {
      this.cache.delete(key);
    } catch (error) {
      
    }
  }

  async flushdb(): Promise<void> {
    try {
      this.cache.clear();
      
    } catch (error) {
      
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Create singleton instance
const memoryCache = new MemoryCache();

// Export the same interface as Redis functions
export async function getCachedData<T>(key: string): Promise<T | null> {
  return memoryCache.get<T>(key);
}

export async function setCachedData<T>(key: string, data: T, ttlSeconds: number = 300): Promise<void> {
  return memoryCache.set<T>(key, data, ttlSeconds);
}

export async function deleteCachedData(key: string): Promise<void> {
  return memoryCache.del(key);
}

export async function clearAllCache(): Promise<void> {
  return memoryCache.flushdb();
}

export default memoryCache;

