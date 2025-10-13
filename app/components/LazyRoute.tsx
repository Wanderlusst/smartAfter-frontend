'use client';

import { Suspense, lazy, ComponentType } from 'react';

interface LazyRouteProps {
  importFunc: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;
}

export default function LazyRoute({ importFunc, fallback }: LazyRouteProps) {
  const LazyComponent = lazy(importFunc);

  return (
    <Suspense fallback={fallback || (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
            <div className="w-8 h-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Loading...
          </h3>
        </div>
      </div>
    )}>
      <LazyComponent />
    </Suspense>
  );
}
