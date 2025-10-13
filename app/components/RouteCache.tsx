'use client';

import { useEffect, useState } from 'react';
import { useDataStore } from '@/app/stores/dataStore';
import { usePathname } from 'next/navigation';
import { cacheService } from '@/app/lib/cacheService';
import { dataSyncService } from '@/app/lib/dataSyncService';

/**
 * RouteCache component ensures data persistence across route changes
 * by maintaining store state and preventing unnecessary re-fetches
 */
export default function RouteCache() {
  const pathname = usePathname();
  const [cacheData, setCacheData] = useState(cacheService.getData());
  const { 
    documents, 
    hasInitialData, 
    isInitialLoading,
    setAuthenticated,
    setInitialData
  } = useDataStore();

  useEffect(() => {
    // PERFORMANCE FIX: Only load cache data if we don't have initial data
    // This prevents unnecessary re-fetching on every route change
    if (hasInitialData) {
      console.log('📄 Route change - data already loaded, skipping cache reload');
      return;
    }
    
    console.log('🔄 Route change detected:', pathname);
    
    // Load data from cache service only if we don't have data
    const cachedData = cacheService.getData();
    if (cachedData && cachedData.documents.length > 0) {
      console.log('📄 Loaded cached data on route change:', {
        documentsCount: cachedData.documents.length,
        totalSpent: cachedData.totalSpent,
        hasInitialData: cachedData.hasInitialData
      });
      
      // Update the store with cached data
      setInitialData({
        documents: cachedData.documents,
        purchases: cachedData.purchases,
        totalSpent: cachedData.totalSpent,
        hasInitialData: cachedData.hasInitialData,
        source: 'cache-service'
      });
    }
    
  }, [pathname, setInitialData, hasInitialData]);

  // Listen for cache changes
  useEffect(() => {
    const unsubscribe = cacheService.addListener(() => {
      setCacheData(cacheService.getData());
    });

    return unsubscribe;
  }, []);

  // Listen for data sync service updates
  useEffect(() => {
    const unsubscribe = dataSyncService.addListener((event) => {
      console.log('🔄 Data sync event in RouteCache:', event.type, event);
      // Update cache data and trigger store update
      const newCacheData = cacheService.getData();
      setCacheData(newCacheData);
      
      if (newCacheData && newCacheData.documents.length > 0) {
        setInitialData({
          documents: newCacheData.documents,
          purchases: newCacheData.purchases,
          totalSpent: newCacheData.totalSpent,
          hasInitialData: newCacheData.hasInitialData,
          source: 'data-sync-service'
        });
      }
    });

    return unsubscribe;
  }, [setInitialData]);

  // No longer listening for localStorage changes - using Supabase for persistence

  // Force re-render when data changes
  useEffect(() => {
    if (documents.length > 0 || (cacheData && cacheData.documents.length > 0)) {
      console.log('📊 Data available on route:', {
        pathname,
        documentsCount: documents.length,
        cacheDocumentsCount: cacheData?.documents.length || 0,
        hasInitialData,
        isInitialLoading
      });
    }
  }, [pathname, documents.length, cacheData, hasInitialData, isInitialLoading]);

  return null; // This component doesn't render anything
}
