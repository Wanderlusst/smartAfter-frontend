import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
// Background fetching completely removed

export const useNonBlockingNavigation = () => {
  const router = useRouter();
  // Background fetching completely removed

  const navigate = useCallback(async (href: string, options?: { 
    prefetch?: boolean;
    replace?: boolean;
    scroll?: boolean;
  }) => {
    const { prefetch = true, replace = false, scroll = true } = options || {};

    try {
      // Background fetching completely removed

      // Navigate immediately (non-blocking)
      if (replace) {
        router.replace(href);
      } else {
        router.push(href);
      }

      // Handle scroll behavior
      if (scroll) {
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
      }

    } catch (error) {
      
      // Fallback to regular navigation
      if (replace) {
        router.replace(href);
      } else {
        router.push(href);
      }
    }
  }, [router]);

  const prefetchRoute = useCallback(async (href: string) => {
    // Background fetching completely removed
    
  }, []);

  const prefetchAllRoutes = useCallback(async (routes: string[]) => {
    // Background fetching completely removed
    
  }, []);

  return {
    navigate,
    prefetchRoute,
    prefetchAllRoutes,
    router
  };
};
