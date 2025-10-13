'use client';

import React, { useEffect, useState } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  cacheHit: boolean;
  dataSize: number;
  timestamp: string;
  route?: string;
}

const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [routeLoadTimes, setRouteLoadTimes] = useState<{[key: string]: number}>({});
  // SWR completely removed

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV === 'development') {
      setIsVisible(true);
    }
  }, []);

  useEffect(() => {
    const handlePerformanceData = (event: CustomEvent) => {
      const { loadTime, cacheHit, dataSize, route } = event.detail;
      setMetrics(prev => [...prev, {
        loadTime,
        cacheHit,
        dataSize,
        timestamp: new Date().toLocaleTimeString(),
        route
      }].slice(-10)); // Keep last 10 metrics
    };

    const handleRouteChange = (event: CustomEvent) => {
      const { route, loadTime } = event.detail;
      setRouteLoadTimes(prev => ({
        ...prev,
        [route]: loadTime
      }));
    };

    // SWR completely removed

    window.addEventListener('performance-data' as any, handlePerformanceData);
    window.addEventListener('route-change' as any, handleRouteChange);
    // SWR completely removed
    
    return () => {
      window.removeEventListener('performance-data' as any, handlePerformanceData);
      window.removeEventListener('route-change' as any, handleRouteChange);
      // SWR completely removed
    };
  }, []);

  if (!isVisible) return null;

  const avgLoadTime = metrics.length > 0 
    ? metrics.reduce((sum, m) => sum + m.loadTime, 0) / metrics.length 
    : 0;

  const cacheHitRate = metrics.length > 0 
    ? (metrics.filter(m => m.cacheHit).length / metrics.length) * 100 
    : 0;

  const avgRouteLoadTime = Object.values(routeLoadTimes).length > 0
    ? Object.values(routeLoadTimes).reduce((sum, time) => sum + time, 0) / Object.values(routeLoadTimes).length
    : 0;

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs font-mono z-50 max-w-sm">
      <div className="mb-2 font-bold text-green-400">Performance Monitor</div>
      <div className="space-y-1">
        <div>API Avg: {avgLoadTime.toFixed(0)}ms</div>
        <div>Route Avg: {avgRouteLoadTime.toFixed(0)}ms</div>
        <div>Cache Hit: {cacheHitRate.toFixed(0)}%</div>
        <div>SWR Cache: Removed</div>
        <div>Metrics: {metrics.length}</div>
      </div>
      
      {metrics.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/20">
          <div className="text-xs opacity-75 mb-1">Latest API:</div>
          <div className="text-xs">
            {metrics[metrics.length - 1].loadTime}ms 
            ({metrics[metrics.length - 1].cacheHit ? 'cache' : 'fresh'})
            {metrics[metrics.length - 1].route && ` - ${metrics[metrics.length - 1].route}`}
          </div>
        </div>
      )}
      
      {Object.keys(routeLoadTimes).length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/20">
          <div className="text-xs opacity-75 mb-1">Routes:</div>
          {Object.entries(routeLoadTimes).slice(-3).map(([route, time]) => (
            <div key={route} className="text-xs">
              {route}: {time.toFixed(0)}ms
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor; 