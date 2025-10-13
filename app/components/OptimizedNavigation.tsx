'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  FileText, 
  Shield, 
  Settings,
  Zap,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useOptimizedNavigation, MAJOR_ROUTES, LoadingState } from '@/app/lib/routePerformance';
import RouteLoadingIndicator, { FullScreenLoadingOverlay, InlineLoadingSpinner } from './RouteLoadingIndicator';
import { routeDataCache, cacheKeys, warmCache } from '@/app/lib/dataCache';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isMajor: boolean;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, isMajor: true },
  { href: '/purchases', label: 'Purchases', icon: ShoppingBag, isMajor: true },
  { href: '/documents', label: 'Documents', icon: FileText, isMajor: true },
  { href: '/warranties', label: 'Warranties', icon: Shield, isMajor: true },
  { href: '/settings', label: 'Settings', icon: Settings, isMajor: false },
];

interface OptimizedNavigationProps {
  className?: string;
  showPerformanceIndicators?: boolean;
}

export default function OptimizedNavigation({ 
  className = '', 
  showPerformanceIndicators = true 
}: OptimizedNavigationProps) {
  const pathname = usePathname();
  const { navigate, prefetch, loadingState, currentRoute, isNavigating } = useOptimizedNavigation();
  const [hoveredRoute, setHoveredRoute] = useState<string | null>(null);
  const [performanceStats, setPerformanceStats] = useState<Record<string, LoadingState>>({});

  // Warm cache on mount
  useEffect(() => {
    warmCache('current-user');
  }, []);

  // Track performance for each route
  useEffect(() => {
    const stats: Record<string, LoadingState> = {};
    MAJOR_ROUTES.forEach(route => {
      const cached = routeDataCache.get(cacheKeys.route(route));
      stats[route] = cached ? 'fast' : 'medium';
    });
    setPerformanceStats(stats);
  }, []);

  const handleRouteClick = useCallback(async (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    
    // Prefetch on hover for instant navigation
    if (hoveredRoute === href) {
      await prefetch(href);
    }
    
    // Navigate with optimization
    await navigate(href, { 
      preload: true,
      scroll: true 
    });
  }, [navigate, prefetch, hoveredRoute]);

  const handleRouteHover = useCallback((href: string) => {
    setHoveredRoute(href);
    
    // Prefetch on hover for major routes
    if (MAJOR_ROUTES.includes(href as any)) {
      prefetch(href);
    }
  }, [prefetch]);

  const getPerformanceIcon = (route: string) => {
    const state = performanceStats[route] || 'medium';
    
    switch (state) {
      case 'fast':
        return <Zap className="w-3 h-3 text-green-500" />;
      case 'medium':
        return <Clock className="w-3 h-3 text-blue-500" />;
      case 'slow':
      case 'very-slow':
        return <AlertCircle className="w-3 h-3 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getPerformanceColor = (route: string) => {
    const state = performanceStats[route] || 'medium';
    
    switch (state) {
      case 'fast':
        return 'text-green-600 hover:text-green-700';
      case 'medium':
        return 'text-blue-600 hover:text-blue-700';
      case 'slow':
        return 'text-yellow-600 hover:text-yellow-700';
      case 'very-slow':
        return 'text-red-600 hover:text-red-700';
      default:
        return 'text-gray-600 hover:text-gray-700';
    }
  };

  return (
    <>
      <nav className={`space-y-2 ${className}`}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isCurrentRoute = currentRoute === item.href;
          const isLoading = isNavigating && isCurrentRoute;
          
          return (
            <motion.div
              key={item.href}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onMouseEnter={() => handleRouteHover(item.href)}
              onMouseLeave={() => setHoveredRoute(null)}
            >
              <Link
                href={item.href}
                onClick={(e) => handleRouteClick(item.href, e)}
                className={`
                  flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                    : getPerformanceColor(item.href)
                  }
                  ${isLoading ? 'opacity-75' : ''}
                  ${item.isMajor ? 'font-medium' : 'font-normal'}
                `}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                  
                  {isLoading && (
                    <InlineLoadingSpinner loadingState={loadingState} size="sm" />
                  )}
                </div>
                
                {showPerformanceIndicators && item.isMajor && (
                  <div className="flex items-center space-x-1">
                    {getPerformanceIcon(item.href)}
                  </div>
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Loading indicators */}
      <RouteLoadingIndicator
        loadingState={loadingState}
        currentRoute={currentRoute}
        isVisible={isNavigating && loadingState !== 'idle'}
      />
      
      <FullScreenLoadingOverlay
        loadingState={loadingState}
        currentRoute={currentRoute}
      />
    </>
  );
}

// Performance stats component
export function NavigationPerformanceStats() {
  const [stats, setStats] = useState<Record<string, any>>({});

  useEffect(() => {
    const updateStats = () => {
      setStats({
        routeData: routeDataCache.getStats(),
        // Add more cache stats as needed
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-xs text-gray-500 space-y-1">
      <div>Cache: {stats.routeData?.size || 0}/{stats.routeData?.maxSize || 0}</div>
      <div>Expired: {stats.routeData?.expired || 0}</div>
      <div>Avg Access: {Math.round(stats.routeData?.avgAccessCount || 0)}</div>
    </div>
  );
}
