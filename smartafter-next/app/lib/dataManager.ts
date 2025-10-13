import React from 'react';

// Progressive Data Loading Manager
// Handles cached data, real-time updates, and smooth animations

interface DataSubscriber {
  (update: DataUpdate): void;
}

interface DataUpdate {
  type: 'SYNC_START' | 'BATCH_UPDATE' | 'VALUE_ANIMATE' | 'SYNC_COMPLETE' | 'SYNC_ERROR';
  data?: any;
  key?: string;
  value?: number;
  error?: string;
  progress?: number;
}

interface CachedData {
  totalSpent: number;
  purchases: any[];
  categories: any[];
  monthlySpending: any[];
  lastUpdated: string;
  purchaseCount: number;
  refundable: { amount: number; percentage: number };
  activeWarranties: number;
  documents: { receipts: number };
}

class DataManager {
  private cache: CachedData;
  private isUpdating: boolean = false;
  private subscribers: Set<DataSubscriber> = new Set();
  private animationFrame: number | null = null;

  constructor() {
    this.cache = this.loadFromLocalStorage();
  }

  // Load cached data immediately
  getCachedData(): CachedData {
    return {
      totalSpent: this.cache.totalSpent || 0,
      purchases: this.cache.purchases || [],
      categories: this.cache.categories || [],
      monthlySpending: this.cache.monthlySpending || [],
      lastUpdated: this.cache.lastUpdated || new Date().toISOString(),
      purchaseCount: this.cache.purchaseCount || 0,
      refundable: this.cache.refundable || { amount: 0, percentage: 0 },
      activeWarranties: this.cache.activeWarranties || 0,
      documents: this.cache.documents || { receipts: 0 }
    };
  }

  // Subscribe to data updates
  subscribe(callback: DataSubscriber): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Notify all subscribers
  private notifySubscribers(update: DataUpdate) {
    this.subscribers.forEach(subscriber => {
      try {
        subscriber(update);
      } catch (error) {
        
      }
    });
  }

  // Start progressive update
  async startProgressiveUpdate(): Promise<void> {
    if (this.isUpdating) return;
    
    this.isUpdating = true;
    this.notifySubscribers({ type: 'SYNC_START' });
    
    try {

      // First, try to get cached data immediately from progressive endpoint
      const cachedResponse = await fetch('/api/purchases/progressive');
      if (cachedResponse.ok) {
        const cachedData = await cachedResponse.json();

        if (cachedData.purchases && cachedData.purchases.length > 0) {
          this.updateWithBatch(cachedData);
          this.notifySubscribers({ type: 'SYNC_COMPLETE' });
          this.isUpdating = false;
          return;
        }
      }

      // If no cached data, try the regular endpoint
      const regularResponse = await fetch('/api/purchases');
      if (regularResponse.ok) {
        const regularData = await regularResponse.json();

        if (regularData.purchases && regularData.purchases.length > 0) {
          this.updateWithBatch(regularData);
          this.notifySubscribers({ type: 'SYNC_COMPLETE' });
          this.isUpdating = false;
          return;
        }
      }

      // If still no data, start streaming
      await this.startStreamingUpdate();
    } catch (error) {
      
      this.notifySubscribers({ 
        type: 'SYNC_ERROR', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      this.isUpdating = false;
    }
  }

  // Start background sync for multiple endpoints
  async startBackgroundSync(): Promise<void> {
    if (this.isUpdating) return;
    
    this.isUpdating = true;
    this.notifySubscribers({ type: 'SYNC_START' });
    
    try {

      // Background fetching completely removed

      // Background fetching completely removed
      
      this.notifySubscribers({ type: 'SYNC_COMPLETE' });

    } catch (error) {
      
      this.notifySubscribers({ 
        type: 'SYNC_ERROR', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      this.isUpdating = false;
    }
  }

  // Start streaming update
  private async startStreamingUpdate(): Promise<void> {
    try {
      const response = await fetch('/api/purchases/stream');
      if (!response.ok) throw new Error('Stream request failed');
      
      const streamData = await response.json();
      
      if (streamData.purchases && streamData.purchases.length > 0) {
        this.updateWithBatch(streamData);
      }
      
      this.notifySubscribers({ type: 'SYNC_COMPLETE' });
    } catch (error) {
      throw error;
    }
  }

  // Update data with new batch
  updateWithBatch(batch: any): void {
    // Animate value changes smoothly
    if (batch.totalSpent !== undefined) {
      this.animateValueUpdate('totalSpent', batch.totalSpent);
    }
    
    if (batch.purchases) {
      this.cache.purchases = batch.purchases;
    }
    
    if (batch.categories) {
      this.cache.categories = batch.categories;
    }
    
    if (batch.monthlySpending) {
      this.cache.monthlySpending = batch.monthlySpending;
    }
    
    if (batch.purchaseCount !== undefined) {
      this.cache.purchaseCount = batch.purchaseCount;
    }
    
    if (batch.refundable) {
      this.cache.refundable = batch.refundable;
    }
    
    if (batch.activeWarranties !== undefined) {
      this.cache.activeWarranties = batch.activeWarranties;
    }
    
    if (batch.documents) {
      this.cache.documents = batch.documents;
    }
    
    this.cache.lastUpdated = new Date().toISOString();
    this.saveToLocalStorage();
    
    this.notifySubscribers({ 
      type: 'BATCH_UPDATE', 
      data: this.cache 
    });
  }

  // Animate number changes smoothly
  animateValueUpdate(key: keyof CachedData, newValue: number): void {
    const currentValue = this.cache[key] as number || 0;
    const diff = newValue - currentValue;
    
    if (Math.abs(diff) < 0.01) {
      (this.cache as any)[key] = newValue;
      return;
    }
    
    const steps = 30;
    const stepValue = diff / steps;
    let step = 0;
    
    const animate = () => {
      if (step < steps) {
        (this.cache as any)[key] = currentValue + (stepValue * step);
        this.notifySubscribers({ 
          type: 'VALUE_ANIMATE', 
          key, 
          value: (this.cache as any)[key] as number
        });
        step++;
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        (this.cache as any)[key] = newValue;
        this.animationFrame = null;
      }
    };
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    animate();
  }

  // Force refresh data
  async forceRefresh(): Promise<void> {
    this.isUpdating = true;
    this.notifySubscribers({ type: 'SYNC_START' });
    
    try {
      const response = await fetch('/api/purchases?refresh=true');
      if (response.ok) {
        const data = await response.json();
        this.updateWithBatch(data);
      }
      this.notifySubscribers({ type: 'SYNC_COMPLETE' });
    } catch (error) {
      this.notifySubscribers({ 
        type: 'SYNC_ERROR', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      this.isUpdating = false;
    }
  }

  // Load from localStorage
  private loadFromLocalStorage(): CachedData {
    try {
      // Check if we're in a browser environment
      if (typeof window !== 'undefined' && window.localStorage) {
        const cached = localStorage.getItem('smartafter-dashboard-cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          // Check if cache is not too old (1 hour)
          const cacheAge = Date.now() - new Date(parsed.lastUpdated).getTime();
          if (cacheAge < 3600000) { // 1 hour
            return parsed;
          }
        }
      }
    } catch (error) {
      
    }
    
    return {
      totalSpent: 0,
      purchases: [],
      categories: [],
      monthlySpending: [],
      lastUpdated: new Date().toISOString(),
      purchaseCount: 0,
      refundable: { amount: 0, percentage: 0 },
      activeWarranties: 0,
      documents: { receipts: 0 }
    };
  }

  // Save to localStorage
  private saveToLocalStorage(): void {
    try {
      // Check if we're in a browser environment
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('smartafter-dashboard-cache', JSON.stringify(this.cache));
      }
    } catch (error) {
      
    }
  }

  // Clear cache
  clearCache(): void {
    this.cache = {
      totalSpent: 0,
      purchases: [],
      categories: [],
      monthlySpending: [],
      lastUpdated: new Date().toISOString(),
      purchaseCount: 0,
      refundable: { amount: 0, percentage: 0 },
      activeWarranties: 0,
      documents: { receipts: 0 }
    };
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('smartafter-dashboard-cache');
    }
  }

  // Check if data is stale
  isDataStale(): boolean {
    if (!this.cache.lastUpdated) return true;
    const now = Date.now();
    const lastUpdated = new Date(this.cache.lastUpdated).getTime();
    return (now - lastUpdated) > 300000; // 5 minutes
  }

  // Get sync status
  getSyncStatus(): 'idle' | 'syncing' | 'complete' | 'error' {
    if (this.isUpdating) return 'syncing';
    return 'idle';
  }

  // Cleanup
  destroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.subscribers.clear();
  }
}

// Create singleton instance
export const dataManager = new DataManager();

// React hook for using the data manager
export const useDataManager = () => {
  const [data, setData] = React.useState(() => dataManager.getCachedData());
  const [syncStatus, setSyncStatus] = React.useState<'idle' | 'syncing' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const unsubscribe = dataManager.subscribe((update) => {
      switch (update.type) {
        case 'SYNC_START':
          setSyncStatus('syncing');
          setProgress(0);
          break;
        case 'BATCH_UPDATE':
          setData(update.data);
          setProgress(100);
          break;
        case 'VALUE_ANIMATE':
          setData(prev => ({ ...prev, [update.key!]: update.value }));
          break;
        case 'SYNC_COMPLETE':
          setSyncStatus('complete');
          // Background processing completely removed
          setSyncStatus('idle');
          break;
        case 'SYNC_ERROR':
          setSyncStatus('error');
          // Background processing completely removed
          setSyncStatus('idle');
          break;
      }
    });

    return unsubscribe;
  }, []);

  const startSync = React.useCallback(() => {
    dataManager.startProgressiveUpdate();
  }, []);

  const startBackgroundSync = React.useCallback(() => {
    dataManager.startBackgroundSync();
  }, []);

  const forceRefresh = React.useCallback(() => {
    dataManager.forceRefresh();
  }, []);

  return {
    data,
    syncStatus,
    progress,
    startSync,
    startBackgroundSync,
    forceRefresh,
    isDataStale: dataManager.isDataStale()
  };
}; 