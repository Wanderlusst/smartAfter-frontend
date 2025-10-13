import { SWRConfiguration } from 'swr';

// Optimized SWR configuration for better performance - ALL BACKGROUND REFRESHING DISABLED
export const swrConfig: SWRConfiguration = {
  // Performance optimizations
  dedupingInterval: 2000, // 2 seconds
  focusThrottleInterval: 5000, // 5 seconds
  loadingTimeout: 3000, // 3 seconds
  errorRetryInterval: 5000, // 5 seconds
  errorRetryCount: 3,
  
  // Caching optimizations
  revalidateOnFocus: false, // Disable revalidation on focus for better performance
  revalidateOnReconnect: false, // DISABLED: No background revalidation
  revalidateIfStale: false, // DISABLED: No background revalidation
  revalidateOnMount: false, // DISABLED: No background revalidation
  
  // Keep previous data for better UX
  keepPreviousData: true,
  
  // Optimize for mobile - ALL BACKGROUND REFRESHING DISABLED
  refreshInterval: 0, // DISABLED: No auto refresh
  refreshWhenHidden: false,
  refreshWhenOffline: false,
  
  // Error handling
  onError: (error, key) => {
    
  },
  
  // Success handling
  onSuccess: (data, key) => {
    
  },
  
  // Compare function for better cache management
  compare: (a, b) => {
    if (a === b) return true;
    if (!a || !b) return false;
    
    // Deep comparison for objects
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      return keysA.every(key => {
        if (!(key in b)) return false;
        return compare(a[key], b[key]);
      });
    }
    
    return false;
  },
  
  // Fetcher with timeout and retry logic
  fetcher: async (url: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },
};

// Helper function for deep comparison
function compare(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => {
      if (!(key in b)) return false;
      return compare(a[key], b[key]);
    });
  }
  
  return false;
}

// Cache configuration for different data types - ALL BACKGROUND REFRESHING DISABLED
export const cacheConfig = {
  // Dashboard data - NO background refresh
  dashboard: {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 minutes
    refreshInterval: 0, // DISABLED: No background refresh
  },
  
  // User data - NO background refresh
  user: {
    revalidateOnFocus: false,
    dedupingInterval: 600000, // 10 minutes
    refreshInterval: 0, // DISABLED: No background refresh
  },
  
  // Documents - NO background refresh
  documents: {
    revalidateOnFocus: false,
    dedupingInterval: 120000, // 2 minutes
    refreshInterval: 0, // DISABLED: No background refresh
  },
  
  // Purchases - NO background refresh
  purchases: {
    revalidateOnFocus: false,
    dedupingInterval: 180000, // 3 minutes
    refreshInterval: 0, // DISABLED: No background refresh
  },
  
  // Refunds - NO background refresh
  refunds: {
    revalidateOnFocus: false,
    dedupingInterval: 180000, // 3 minutes
    refreshInterval: 0, // DISABLED: No background refresh
  },
  
  // Warranties - NO background refresh
  warranties: {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 minutes
    refreshInterval: 0, // DISABLED: No background refresh
  },
};

// Performance monitoring for SWR
export const swrPerformanceMonitor = {
  startTime: 0,
  endTime: 0,
  
  start() {
    this.startTime = performance.now();
  },
  
  end() {
    this.endTime = performance.now();
    const duration = this.endTime - this.startTime;
    
    return duration;
  },
  
  measure<T>(fn: () => Promise<T>): Promise<T> {
    this.start();
    return fn().finally(() => this.end());
  },
}; 