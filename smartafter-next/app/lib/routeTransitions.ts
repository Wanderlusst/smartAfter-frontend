'use client';

import { startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

// Preload routes for instant navigation
export const preloadRoute = (href: string) => {
  if (typeof window === 'undefined') return;
  
  // Create prefetch link
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  
  // Avoid duplicate prefetch links
  const existingLink = document.querySelector(`link[href="${href}"]`);
  if (!existingLink) {
    document.head.appendChild(link);
  }
};

// Preload multiple routes
export const preloadRoutes = (routes: string[]) => {
  routes.forEach(preloadRoute);
};

// Enhanced navigation hook with transitions
export const useOptimizedNavigation = () => {
  const router = useRouter();

  const navigateWithTransition = useCallback((href: string, options?: {
    preload?: boolean;
    replace?: boolean;
  }) => {
    const { preload = true, replace = false } = options || {};

    // Preload the route before navigation
    if (preload) {
      preloadRoute(href);
    }

    // Use startTransition to prevent blocking UI updates
    startTransition(() => {
      if (replace) {
        router.replace(href);
      } else {
        router.push(href);
      }
    });
  }, [router]);

  const prefetchAndNavigate = useCallback((href: string) => {
    // Immediate prefetch
    preloadRoute(href);
    
    // Navigate with slight delay to allow prefetch
    setTimeout(() => {
      navigateWithTransition(href, { preload: false });
    }, 50);
  }, [navigateWithTransition]);

  return {
    navigate: navigateWithTransition,
    prefetchAndNavigate,
    preloadRoute,
    preloadRoutes
  };
};

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
    scale: 1
  },
  exit: { 
    opacity: 0, 
    y: -20,
    scale: 0.98
  }
};

export const routeTransitionConfig = {
  duration: 0.3,
  ease: [0.25, 0.25, 0, 1] as const
};

// Page transition wrapper component props
export interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

// Critical routes to preload immediately
export const CRITICAL_ROUTES = [
  '/dashboard',
  '/purchases', 
  '/warranties',
  '/refunds',
  '/documents',
  '/settings'
];

// Initialize critical route preloading
export const initializeCriticalRoutes = () => {
  if (typeof window === 'undefined') return;
  
  // DISABLED: Background route preloading to prevent background processing
  // Preload critical routes after a short delay
  // setTimeout(() => {
  //   preloadRoutes(CRITICAL_ROUTES);
  // }, 1000);
};

// Background sync disabled - no route optimizations
export const routeOptimizations = {
  '/dashboard': {
    prefetchData: async () => {
      
    }
  },
  '/purchases': {
    prefetchData: async () => {
      
    }
  },
  '/warranties': {
    prefetchData: async () => {
      
    }
  }
};

// Enhanced preload with data prefetching
export const preloadRouteWithData = async (href: string) => {
  // Preload the route
  preloadRoute(href);
  
  // Prefetch route-specific data
  const optimization = routeOptimizations[href as keyof typeof routeOptimizations];
  if (optimization?.prefetchData) {
    try {
      await optimization.prefetchData();
    } catch (error) {
      
    }
  }
}; 