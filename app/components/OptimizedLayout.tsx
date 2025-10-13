'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import OptimizedNavigation from './OptimizedNavigation';
import RouteLoadingIndicator, { FullScreenLoadingOverlay } from './RouteLoadingIndicator';
import { useOptimizedNavigation } from '@/app/lib/routePerformance';
import { warmCache } from '@/app/lib/dataCache';

interface OptimizedLayoutProps {
  children: React.ReactNode;
  showPerformanceStats?: boolean;
}

export default function OptimizedLayout({ 
  children, 
  showPerformanceStats = false 
}: OptimizedLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { loadingState, currentRoute, isNavigating } = useOptimizedNavigation();
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize performance optimizations
  useEffect(() => {
    const initialize = async () => {
      try {
        // Warm cache for better performance
        if (session?.user?.email) {
          await warmCache(session.user.email);
        }
        
        // Preload critical routes
        const criticalRoutes = ['/dashboard', '/purchases', '/documents', '/warranties'];
        criticalRoutes.forEach(route => {
          // Preload route data
          fetch(`/api${route}/fast?cache=true`).catch(() => {
            // Ignore errors for preloading
          });
        });
        
        setIsInitializing(false);
      } catch (error) {
        console.warn('Initialization error:', error);
        setIsInitializing(false);
      }
    };

    initialize();
  }, [session?.user?.email]);

  // Handle authentication
  if (status === 'loading' || isInitializing) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Initializing application...</p>
        </motion.div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/landing');
    return null;
  }

  return (
    <div className="flex h-screen w-screen bg-gray-50 dark:bg-gray-900">
      {/* Optimized Sidebar */}
      <aside className="relative z-30 h-full w-64 bg-[#0D1117] border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white">SmartAf</h1>
          <p className="text-sm text-gray-400">Financial Dashboard</p>
        </div>
        
        <div className="flex-1 p-4">
          <OptimizedNavigation 
            showPerformanceIndicators={showPerformanceStats}
          />
        </div>
        
        {showPerformanceStats && (
          <div className="p-4 border-t border-slate-800">
            <div className="text-xs text-gray-500">
              <div>Status: {isNavigating ? 'Loading...' : 'Ready'}</div>
              <div>Route: {currentRoute || 'None'}</div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentRoute || 'default'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Loading Indicators */}
      <RouteLoadingIndicator
        loadingState={loadingState}
        currentRoute={currentRoute}
        isVisible={isNavigating && loadingState !== 'idle'}
      />
      
      <FullScreenLoadingOverlay
        loadingState={loadingState}
        currentRoute={currentRoute}
      />
    </div>
  );
}

// Performance monitoring component
export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    routeChanges: 0,
    averageLoadTime: 0,
    cacheHitRate: 0
  });

  useEffect(() => {
    // Monitor performance metrics
    const updateMetrics = () => {
      // In a real implementation, you'd collect these from the performance tracking
      setMetrics(prev => ({
        ...prev,
        routeChanges: prev.routeChanges + 1
      }));
    };

    // Listen for route changes
    const handleRouteChange = () => updateMetrics();
    window.addEventListener('popstate', handleRouteChange);
    
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  return (
    <div className="fixed bottom-4 left-4 bg-black/80 text-white p-3 rounded-lg text-xs space-y-1">
      <div>Route Changes: {metrics.routeChanges}</div>
      <div>Avg Load Time: {metrics.averageLoadTime}ms</div>
      <div>Cache Hit Rate: {metrics.cacheHitRate}%</div>
    </div>
  );
}
