'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useTransition, useRef } from 'react';

// Global navigation state
let isNavigating = false;
let navigationQueue: Array<() => void> = [];

// Route preloading cache
const preloadedRoutes = new Set<string>();

// Background operation tracking
let backgroundOperations = new Set<string>();

export function useNonBlockingNavigation() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const abortControllerRef = useRef<AbortController | null>(null);

  const navigate = useCallback((path: string, options?: { replace?: boolean; scroll?: boolean }) => {
    // Don't block navigation even if background operations are running

    // Cancel any ongoing navigation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this navigation
    abortControllerRef.current = new AbortController();
    
    startTransition(() => {
      if (abortControllerRef.current?.signal.aborted) return;
      
      try {
        
        if (options?.replace) {
          router.replace(path);
        } else {
          router.push(path);
        }
      } catch (error) {
        
      }
    });
  }, [router]);

  const prefetch = useCallback((path: string) => {
    if (!preloadedRoutes.has(path)) {
      router.prefetch(path);
      preloadedRoutes.add(path);
    }
  }, [router]);

  return { 
    navigate, 
    prefetch, 
    isPending,
    isNavigating: isPending || isNavigating
  };
}

// Track background operations
export function trackBackgroundOperation(operationId: string) {
  backgroundOperations.add(operationId);
  
}

export function untrackBackgroundOperation(operationId: string) {
  backgroundOperations.delete(operationId);
  
}

export function hasBackgroundOperations(): boolean {
  return backgroundOperations.size > 0;
}

// Preload critical routes
export function initializeCriticalRoutes() {
  const criticalRoutes = [
    '/dashboard',
    '/purchases',
    '/refunds',
    '/warranties',
    '/documents',
    '/settings'
  ];

  // Preload routes in background
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      criticalRoutes.forEach(route => {
        if (!preloadedRoutes.has(route)) {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = route;
          document.head.appendChild(link);
          preloadedRoutes.add(route);
        }
      });
    }, 100);
  }
}

// Prevent navigation blocking during data fetching
export function createNonBlockingFetch(url: string, options?: RequestInit) {
  const controller = new AbortController();
  
  const fetchPromise = fetch(url, {
    ...options,
    signal: controller.signal,
    // Add cache headers to prevent blocking
    headers: {
      ...options?.headers,
      'Cache-Control': 'no-store',
      'Priority': 'low' // Use low priority for background requests
    }
  });

  return {
    promise: fetchPromise,
    abort: () => controller.abort()
  };
}

// Queue background operations to prevent navigation blocking
export function queueBackgroundOperation(operation: () => Promise<void>) {
  // DISABLED: Background operation queueing to prevent background processing
  
  return 'disabled';
  
  // const operationId = `bg-op-${Date.now()}-${Math.random()}`;
  
  // const wrappedOperation = async () => {
  //   trackBackgroundOperation(operationId);
  //   try {
  //     await operation();
  //   } finally {
  //     untrackBackgroundOperation(operationId);
  //   }
  // };

  // // Execute in background without blocking navigation
  // if (typeof window !== 'undefined') {
  //   // Use requestIdleCallback for non-blocking execution
  //   if ('requestIdleCallback' in window) {
  //     (window as any).requestIdleCallback(() => {
  //       wrappedOperation();
  //     }, { timeout: 1000 });
  //   } else {
  //     // Fallback to setTimeout
  //     setTimeout(wrappedOperation, 0);
  //   }
  // }

  // return operationId;
}

// Process navigation queue
export function processNavigationQueue() {
  while (navigationQueue.length > 0) {
    const operation = navigationQueue.shift();
    if (operation) {
      operation();
    }
  }
}

// Set navigation state
export function setNavigationState(navigating: boolean) {
  isNavigating = navigating;
}

// Optimized fetch with retry and timeout
export async function optimizedFetch(url: string, options?: RequestInit & { retries?: number }) {
  const maxRetries = options?.retries || 3;
  let lastError: Error = new Error('Request failed');

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...options?.headers,
          'Cache-Control': 'no-store',
          'Priority': 'low'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Request failed after all retries');
}

// Optimize route transitions
export function optimizeRouteTransition(from: string, to: string) {

  // Preload the target route
  if (typeof window !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = to;
    document.head.appendChild(link);
  }
}

// Debounced navigation hook
export function useDebouncedNavigation(delay = 300) {
  const { navigate } = useNonBlockingNavigation();
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const debouncedNavigate = useCallback((path: string, options?: { replace?: boolean; scroll?: boolean }) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      navigate(path, options);
    }, delay);
  }, [navigate, delay]);

  return { debouncedNavigate };
} 