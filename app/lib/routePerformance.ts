'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useTransition, useRef, useState, useEffect } from 'react';

// Performance tracking
interface RoutePerformance {
  route: string;
  loadTime: number;
  timestamp: number;
  cached: boolean;
}

// Route cache for instant navigation
const routeCache = new Map<string, any>();
const routeLoadTimes = new Map<string, number>();

// Major routes that need optimization
export const MAJOR_ROUTES = [
  '/dashboard',
  '/purchases', 
  '/documents',
  '/warranties'
] as const;

export type MajorRoute = typeof MAJOR_ROUTES[number];

// Route preloading system
const preloadedRoutes = new Set<string>();
const preloadPromises = new Map<string, Promise<any>>();

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  FAST: 200,      // < 200ms - instant
  MEDIUM: 500,    // 200-500ms - show minimal spinner
  SLOW: 1000,     // 500-1000ms - show loading spinner
  VERY_SLOW: 2000 // > 1000ms - show full loading screen
} as const;

export type LoadingState = 'idle' | 'fast' | 'medium' | 'slow' | 'very-slow';

// Route performance tracking
export function trackRoutePerformance(route: string, loadTime: number, cached: boolean = false) {
  routeLoadTimes.set(route, loadTime);
  
  // Store performance data
  const performance: RoutePerformance = {
    route,
    loadTime,
    timestamp: Date.now(),
    cached
  };
  
  // Store in localStorage for persistence
  if (typeof window !== 'undefined') {
    const existing = JSON.parse(localStorage.getItem('route-performance') || '[]');
    existing.push(performance);
    
    // Keep only last 50 entries
    if (existing.length > 50) {
      existing.splice(0, existing.length - 50);
    }
    
    localStorage.setItem('route-performance', JSON.stringify(existing));
  }
}

// Get route performance history
export function getRoutePerformance(route: string): RoutePerformance[] {
  if (typeof window === 'undefined') return [];
  
  const existing = JSON.parse(localStorage.getItem('route-performance') || '[]');
  return existing.filter((p: RoutePerformance) => p.route === route);
}

// Get average load time for route
export function getAverageLoadTime(route: string): number {
  const history = getRoutePerformance(route);
  if (history.length === 0) return 0;
  
  const total = history.reduce((sum, p) => sum + p.loadTime, 0);
  return total / history.length;
}

// Predict loading state based on route history
export function predictLoadingState(route: string): LoadingState {
  const avgTime = getAverageLoadTime(route);
  
  if (avgTime < PERFORMANCE_THRESHOLDS.FAST) return 'fast';
  if (avgTime < PERFORMANCE_THRESHOLDS.MEDIUM) return 'medium';
  if (avgTime < PERFORMANCE_THRESHOLDS.SLOW) return 'slow';
  return 'very-slow';
}

// Preload route data
export async function preloadRoute(route: string): Promise<void> {
  if (preloadedRoutes.has(route)) return;
  
  const startTime = performance.now();
  
  try {
    // Preload route data based on route type
    let preloadPromise: Promise<any>;
    
    switch (route) {
      case '/dashboard':
        preloadPromise = fetch('/api/dashboard?ssr=true&cache=true');
        break;
      case '/purchases':
        preloadPromise = fetch('/api/purchases/fast?cache=true');
        break;
      case '/documents':
        preloadPromise = fetch('/api/documents/fast?cache=true');
        break;
      case '/warranties':
        preloadPromise = fetch('/api/warranties/fast?cache=true');
        break;
      default:
        return;
    }
    
    preloadPromises.set(route, preloadPromise);
    
    const response = await preloadPromise;
    if (response.ok) {
      const data = await response.json();
      routeCache.set(route, data);
      preloadedRoutes.add(route);
      
      const loadTime = performance.now() - startTime;
      trackRoutePerformance(route, loadTime, true);
    }
  } catch (error) {
    console.warn(`Failed to preload route ${route}:`, error);
  }
}

// Preload all major routes
export async function preloadAllMajorRoutes(): Promise<void> {
  const promises = MAJOR_ROUTES.map(route => preloadRoute(route));
  await Promise.allSettled(promises);
}

// Get cached route data
export function getCachedRouteData(route: string): any {
  return routeCache.get(route);
}

// Clear route cache
export function clearRouteCache(route?: string): void {
  if (route) {
    routeCache.delete(route);
    preloadedRoutes.delete(route);
    preloadPromises.delete(route);
  } else {
    routeCache.clear();
    preloadedRoutes.clear();
    preloadPromises.clear();
  }
}

// Enhanced navigation hook with performance optimization
export function useOptimizedNavigation() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [currentRoute, setCurrentRoute] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Preload routes on mount
  useEffect(() => {
    preloadAllMajorRoutes();
  }, []);

  const navigate = useCallback(async (href: string, options?: {
    replace?: boolean;
    scroll?: boolean;
    preload?: boolean;
  }) => {
    const { replace = false, scroll = true, preload = true } = options || {};
    
    // Cancel any ongoing navigation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    const startTime = performance.now();
    setCurrentRoute(href);
    
    // Predict loading state
    const predictedState = predictLoadingState(href);
    setLoadingState(predictedState);
    
    // Check if we have cached data
    const cachedData = getCachedRouteData(href);
    if (cachedData) {
      setLoadingState('fast');
    }
    
    // Preload if requested
    if (preload && !preloadedRoutes.has(href)) {
      await preloadRoute(href);
    }
    
    // Navigate with transition
    startTransition(() => {
      if (abortControllerRef.current?.signal.aborted) return;
      
      try {
        if (replace) {
          router.replace(href);
        } else {
          router.push(href);
        }
        
        // Track performance
        const loadTime = performance.now() - startTime;
        trackRoutePerformance(href, loadTime, !!cachedData);
        
        // Update loading state based on actual performance
        if (loadTime < PERFORMANCE_THRESHOLDS.FAST) {
          setLoadingState('fast');
        } else if (loadTime < PERFORMANCE_THRESHOLDS.MEDIUM) {
          setLoadingState('medium');
        } else if (loadTime < PERFORMANCE_THRESHOLDS.SLOW) {
          setLoadingState('slow');
        } else {
          setLoadingState('very-slow');
        }
        
        // Reset loading state after navigation
        setTimeout(() => {
          setLoadingState('idle');
        }, 100);
        
      } catch (error) {
        console.error('Navigation error:', error);
        setLoadingState('idle');
      }
    });
  }, [router]);

  const prefetch = useCallback((href: string) => {
    preloadRoute(href);
  }, []);

  return {
    navigate,
    prefetch,
    isPending,
    loadingState,
    currentRoute,
    isNavigating: isPending || loadingState !== 'idle'
  };
}

// Route transition animations
export const routeTransitionVariants = {
  initial: { 
    opacity: 0, 
    y: 20,
    scale: 0.98
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    scale: 0.98,
    transition: {
      duration: 0.15,
      ease: "easeIn"
    }
  }
};

// Loading component variants based on state
export const loadingVariants = {
  fast: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: 0.1 }
  },
  medium: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2 }
  },
  slow: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3 }
  },
  'very-slow': {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5 }
  }
};
