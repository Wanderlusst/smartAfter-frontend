
// Debounce function for performance
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function for performance
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Memoization helper
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  resolver?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = resolver ? resolver(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// Intersection Observer for lazy loading
export function createIntersectionObserver(
  callback: IntersectionObserverCallback,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  return new IntersectionObserver(callback, {
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  });
}

// Resource preloading
export function preloadResource(href: string, as: string = 'fetch'): void {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    document.head.appendChild(link);
  }
}

// Image lazy loading
export function lazyLoadImage(img: HTMLImageElement, src: string): void {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = src;
          img.classList.remove('lazy');
          observer.unobserve(img);
        }
      });
    });
    
    observer.observe(img);
  } else {
    // Fallback for older browsers
    img.src = src;
  }
}

// Route prefetching for faster navigation
export const prefetchRoutes = () => {
  // DISABLED: Background route prefetching to prevent background processing
  
  return;
  
  // const routes = [
  //   '/dashboard',
  //   '/purchases', 
  //   '/refunds',
  //   '/warranties',
  //   '/documents',
  //   '/settings',
  //   '/inbox'
  // ];

  // routes.forEach(route => {
  //   const link = document.createElement('link');
  //   link.rel = 'prefetch';
  //   link.href = route;
  //   document.head.appendChild(link);
  // });
};

// Background sync disabled - no data preloading
export const preloadRouteData = async () => {
  
};

// Optimize route transitions
export const optimizeRouteTransition = (pathname: string) => {
  // DISABLED: Background route optimization to prevent background processing
  
  return;
  
  // // Prefetch related routes
  // const relatedRoutes = {
  //   '/dashboard': ['/purchases', '/refunds', '/warranties'],
  //   '/purchases': ['/dashboard', '/refunds', '/documents'],
  //   '/refunds': ['/dashboard', '/purchases', '/warranties'],
  //   '/warranties': ['/dashboard', '/purchases', '/refunds'],
  //   '/documents': ['/dashboard', '/purchases', '/inbox'],
  // };

  // const routesToPrefetch = relatedRoutes[pathname as keyof typeof relatedRoutes] || [];
  // routesToPrefetch.forEach(route => {
  //   const link = document.createElement('link');
  //   link.rel = 'prefetch';
  //   link.href = route;
  //   document.head.appendChild(link);
  // });
};

// Performance monitoring
export const trackRouteChange = (from: string, to: string, duration: number) => {
  if (process.env.NODE_ENV === 'development') {
    
  }
  
  // Dispatch custom event for performance monitoring
  window.dispatchEvent(new CustomEvent('route-change', {
    detail: { from, to, duration }
  }));
};

// Cache management utilities
export const clearRouteCache = () => {
  // SWR completely removed
  
};

export const getCacheStats = () => {
  // SWR completely removed
  return {
    totalCached: 0,
    cacheKeys: []
  };
};

// Background sync disabled - no instant routing optimization
export const optimizeForInstantRouting = () => {
  
};

// Bundle size optimization helpers
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Virtual scrolling helper
export function calculateVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number
): { start: number; end: number } {
  const start = Math.floor(scrollTop / itemHeight);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const end = Math.min(start + visibleCount + 1, totalItems);
  
  return {
    start: Math.max(0, start - 5), // Buffer
    end: Math.min(totalItems, end + 5), // Buffer
  };
}

// Memory management
export function cleanupMemory(): void {
  if (typeof window !== 'undefined' && 'gc' in window) {
    // @ts-ignore
    window.gc();
  }
}

// Network status monitoring
export function getNetworkInfo(): {
  effectiveType: string;
  downlink: number;
  rtt: number;
} {
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const connection = (navigator as any).connection;
    return {
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
    };
  }
  return { effectiveType: 'unknown', downlink: 0, rtt: 0 };
} 