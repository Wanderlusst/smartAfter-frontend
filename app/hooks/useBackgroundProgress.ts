'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface ProgressData {
  isActive: boolean;
  progress: number;
  documentsFound: number;
  status: 'idle' | 'syncing' | 'success' | 'error';
  message: string;
  lastSyncTime?: string;
}

// Global state management
let globalProgressData: ProgressData = {
  isActive: false,
  progress: 0,
  documentsFound: 0,
  status: 'idle',
  message: 'Ready to sync'
};

let globalListeners: Set<(data: ProgressData) => void> = new Set();
let pollingInterval: NodeJS.Timeout | null = null;
let isPolling = false;
let lastToastId: string | number | null = null;

const POLLING_INTERVAL = 2000; // Poll every 2 seconds
const API_URL = '/api/background-progress';

class BackgroundProgressManager {
  private static instance: BackgroundProgressManager;

  static getInstance(): BackgroundProgressManager {
    if (!BackgroundProgressManager.instance) {
      BackgroundProgressManager.instance = new BackgroundProgressManager();
    }
    return BackgroundProgressManager.instance;
  }

  async fetchProgress(): Promise<ProgressData> {
    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-cache'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        isActive: data.isActive || false,
        progress: data.progress || 0,
        documentsFound: data.documentsFound || 0,
        status: data.status || 'idle',
        message: data.message || 'Processing...',
        lastSyncTime: data.lastSyncTime
      };
    } catch (error) {
      console.error('❌ Error fetching background progress:', error);
      return {
        isActive: false,
        progress: 0,
        documentsFound: 0,
        status: 'error',
        message: 'Sync failed - will retry',
        lastSyncTime: globalProgressData.lastSyncTime
      };
    }
  }

  startPolling(): void {
    if (isPolling) return;
    
    isPolling = true;
    console.log('🔄 Starting background progress polling...');

    // Initial fetch
    this.fetchProgress().then(data => {
      this.updateProgress(data);
    });

    // Set up polling
    pollingInterval = setInterval(async () => {
      const data = await this.fetchProgress();
      this.updateProgress(data);
    }, POLLING_INTERVAL);
  }

  stopPolling(): void {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    isPolling = false;
    console.log('⏹️ Stopped background progress polling');
  }

  updateProgress(newData: ProgressData): void {
    const prevData = { ...globalProgressData };
    globalProgressData = { ...newData };

    // Notify all listeners
    globalListeners.forEach(listener => listener(globalProgressData));

    // Handle toaster notifications
    this.handleToasterNotifications(prevData, newData);
  }

  private handleToasterNotifications(prevData: ProgressData, newData: ProgressData): void {
    // Show progress toast when sync starts
    if (!prevData.isActive && newData.isActive && newData.status === 'syncing') {
      if (lastToastId) {
        toast.dismiss(lastToastId);
      }
      
      lastToastId = toast.loading(
        `Syncing 3 months of data... ${newData.documentsFound} docs processed`,
        {
          description: `${newData.progress}% complete - ${newData.message}`,
          duration: Infinity,
          position: 'bottom-right'
        }
      );
      console.log('🍞 Showing sync progress toast');
    }

    // Update progress toast
    if (newData.isActive && newData.status === 'syncing' && lastToastId) {
      toast.loading(
        `Syncing 3 months of data... ${newData.documentsFound} docs processed`,
        {
          id: lastToastId,
          description: `${newData.progress}% complete - ${newData.message}`,
          duration: Infinity,
          position: 'bottom-right'
        }
      );
    }

    // Show success toast
    if (prevData.status === 'syncing' && newData.status === 'success') {
      if (lastToastId) {
        toast.dismiss(lastToastId);
        lastToastId = null;
      }
      
      toast.success(
        `3-month sync completed! ${newData.documentsFound} documents processed`,
        {
          description: 'Your financial data is now up to date',
          duration: 5000,
          position: 'bottom-right'
        }
      );
      console.log('🍞 Showing sync success toast');
    }

    // Show error toast
    if (prevData.status === 'syncing' && newData.status === 'error') {
      if (lastToastId) {
        toast.dismiss(lastToastId);
        lastToastId = null;
      }
      
      toast.error('Sync failed', {
        description: 'There was an error syncing your data. Will retry automatically.',
        duration: 5000,
        position: 'bottom-right'
      });
      console.log('🍞 Showing sync error toast');
    }
  }

  subscribe(listener: (data: ProgressData) => void): () => void {
    globalListeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      globalListeners.delete(listener);
    };
  }

  getCurrentData(): ProgressData {
    return { ...globalProgressData };
  }
}

export function useBackgroundProgress() {
  const [progressData, setProgressData] = useState<ProgressData>(globalProgressData);
  const managerRef = useRef<BackgroundProgressManager | null>(null);

  useEffect(() => {
    // Get singleton instance
    managerRef.current = BackgroundProgressManager.getInstance();
    
    // Start polling
    managerRef.current.startPolling();

    // Subscribe to updates
    const unsubscribe = managerRef.current.subscribe((data) => {
      setProgressData({ ...data });
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
      // Don't stop polling on unmount - let it continue for other components
    };
  }, []);

  return progressData;
}

// Export singleton manager
export const backgroundProgressManager = BackgroundProgressManager.getInstance();
