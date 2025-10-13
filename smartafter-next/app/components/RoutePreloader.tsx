'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RoutePreloader() {
  const router = useRouter();

  useEffect(() => {
    // Preload all main routes
    const routes = [
      '/purchases',
      '/warranties', 
      '/refunds',
      '/inbox',
      '/documents',
      '/dashboard'
    ];

    // Prefetch routes with a small delay to avoid blocking initial load
    const timer = setTimeout(() => {
      routes.forEach(route => {
        try {
          router.prefetch(route);
        } catch (error) {
          // Silently ignore prefetch errors
        }
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [router]);

  return null; // This component doesn't render anything
}
