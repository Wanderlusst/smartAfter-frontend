'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';

/**
 * RoutePrefetcher - Preloads routes for instant navigation
 * This component runs in the background to prefetch route data
 */
export default function RoutePrefetcher() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Only prefetch for authenticated users
    const isAuthenticated = typeof window !== 'undefined' && 
      localStorage.getItem('smartafter-session') !== null;
    
    if (!isAuthenticated) return;

    // Define routes to prefetch
    const routesToPrefetch = [
      '/dashboard',
      '/purchases', 
      '/documents',
      '/warranties',
      '/refunds',
      '/settings'
    ];

    // Prefetch routes that aren't the current route
    const routesToPreload = routesToPrefetch.filter(route => route !== pathname);
    
    // Prefetch each route with a small delay to avoid blocking
    routesToPreload.forEach((route, index) => {
      setTimeout(() => {
        try {
          // Use Next.js router.prefetch for optimal performance
          router.prefetch(route);
          console.log(`🚀 Prefetched route: ${route}`);
        } catch (error) {
          console.warn(`Failed to prefetch ${route}:`, error);
        }
      }, index * 100); // Stagger prefetching
    });

  }, [pathname, router]);

  return null; // This component doesn't render anything
}
