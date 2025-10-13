'use client';

/**
 * Data Synchronization Service
 * Ensures data consistency across all pages (dashboard, documents, etc.)
 * Provides a centralized way to manage data updates and notifications
 */

import { cacheService } from './cacheService';

interface DataSyncEvent {
  type: 'documents_updated' | 'purchases_updated' | 'data_cleared' | 'cache_updated';
  data?: any;
  source: string;
  timestamp: number;
}

class DataSyncService {
  private static instance: DataSyncService;
  private listeners: Set<(event: DataSyncEvent) => void> = new Set();
  private isUpdating = false;

  private constructor() {}

  static getInstance(): DataSyncService {
    if (!DataSyncService.instance) {
      DataSyncService.instance = new DataSyncService();
    }
    return DataSyncService.instance;
  }

  // Add listener for data sync events
  addListener(listener: (event: DataSyncEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners of data changes
  private notifyListeners(event: DataSyncEvent) {
    console.log('🔄 DataSyncService: Notifying listeners of', event.type, event);
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in data sync listener:', error);
      }
    });
  }

  // Update documents across all pages
  async updateDocuments(documents: any[], source: string = 'unknown') {
    if (this.isUpdating) {
      console.log('⏸️ DataSyncService: Update already in progress, skipping');
      return;
    }

    this.isUpdating = true;
    console.log('🔄 DataSyncService: Updating documents from', source, documents.length);

    try {
      // Update cache service
      cacheService.addDocuments(documents);

      // Notify listeners
      this.notifyListeners({
        type: 'documents_updated',
        data: documents,
        source,
        timestamp: Date.now()
      });

      // Dispatch global event for components that listen to window events
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('dataSyncUpdated', {
          detail: { type: 'documents_updated', count: documents.length, source }
        }));
      }

      console.log('✅ DataSyncService: Documents updated successfully');
    } catch (error) {
      console.error('❌ DataSyncService: Error updating documents:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  // Update purchases across all pages
  async updatePurchases(purchases: any[], source: string = 'unknown') {
    if (this.isUpdating) {
      console.log('⏸️ DataSyncService: Update already in progress, skipping');
      return;
    }

    this.isUpdating = true;
    console.log('🔄 DataSyncService: Updating purchases from', source, purchases.length);

    try {
      // Update cache service
      cacheService.updatePurchases(purchases);

      // Notify listeners
      this.notifyListeners({
        type: 'purchases_updated',
        data: purchases,
        source,
        timestamp: Date.now()
      });

      // Dispatch global event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('dataSyncUpdated', {
          detail: { type: 'purchases_updated', count: purchases.length, source }
        }));
      }

      console.log('✅ DataSyncService: Purchases updated successfully');
    } catch (error) {
      console.error('❌ DataSyncService: Error updating purchases:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  // Clear all data across all pages
  async clearAllData(source: string = 'unknown') {
    console.log('🧹 DataSyncService: Clearing all data from', source);

    try {
      // Clear cache service
      cacheService.clearCache();

      // Notify listeners
      this.notifyListeners({
        type: 'data_cleared',
        source,
        timestamp: Date.now()
      });

      // Dispatch global event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('dataSyncUpdated', {
          detail: { type: 'data_cleared', source }
        }));
      }

      console.log('✅ DataSyncService: All data cleared successfully');
    } catch (error) {
      console.error('❌ DataSyncService: Error clearing data:', error);
    }
  }

  // Get current data from cache service
  getCurrentData() {
    return cacheService.getData();
  }

  // Force refresh all pages
  async forceRefreshAll(source: string = 'unknown') {
    console.log('🔄 DataSyncService: Force refreshing all pages from', source);

    // Dispatch global refresh event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('forceRefreshAll', {
        detail: { source, timestamp: Date.now() }
      }));
    }

    // Notify listeners
    this.notifyListeners({
      type: 'cache_updated',
      source,
      timestamp: Date.now()
    });
  }

  // Check if update is in progress
  isUpdateInProgress(): boolean {
    return this.isUpdating;
  }
}

// Export singleton instance
export const dataSyncService = DataSyncService.getInstance();
