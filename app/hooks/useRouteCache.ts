import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function useRouteCache() {
  const pathname = usePathname();
  const lastPathname = useRef<string | null>(null);
  const routeCache = useRef<Map<string, { data: any; timestamp: number }>>(new Map());

  useEffect(() => {
    // If this is a route switch (not initial load)
    if (lastPathname.current && lastPathname.current !== pathname) {

      // Check if we have cached data for the new route
      const cachedRouteData = routeCache.current.get(pathname);
      if (cachedRouteData) {
        const cacheAge = Date.now() - cachedRouteData.timestamp;
        if (cacheAge < 10 * 60 * 1000) { // 10 minutes
          
        }
      }
    }
    
    lastPathname.current = pathname;
  }, [pathname]);

  // Cache data for a specific route
  const cacheRouteData = (route: string, data: any) => {
    routeCache.current.set(route, {
      data,
      timestamp: Date.now()
    });
    
  };

  // Get cached data for a route
  const getCachedRouteData = (route: string) => {
    const cached = routeCache.current.get(route);
    if (cached) {
      const cacheAge = Date.now() - cached.timestamp;
      if (cacheAge < 10 * 60 * 1000) { // 10 minutes
        return cached.data;
      }
      // Remove expired cache
      routeCache.current.delete(route);
    }
    return null;
  };

  // Clear expired cache entries
  const cleanupExpiredCache = () => {
    const now = Date.now();
    for (const [route, entry] of routeCache.current.entries()) {
      if (now - entry.timestamp > 10 * 60 * 1000) { // 10 minutes
        routeCache.current.delete(route);
        
      }
    }
  };

  // Run cleanup every 5 minutes
  useEffect(() => {
    // DISABLED: Background cache cleanup to prevent background processing
    // const interval = setInterval(cleanupExpiredCache, 5 * 60 * 1000);
    // return () => clearInterval(interval);
  }, []);

  return {
    pathname,
    cacheRouteData,
    getCachedRouteData,
    cleanupExpiredCache
  };
}
