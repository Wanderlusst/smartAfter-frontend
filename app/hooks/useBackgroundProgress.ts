'use client';

import { useState, useEffect } from 'react';

interface ProgressData {
  isActive: boolean;
  progress: number;
  documentsFound: number;
  status: 'idle' | 'syncing' | 'success' | 'error';
  message: string;
  lastSyncTime?: string;
}

// Simple static data - NO POLLING
const staticProgressData: ProgressData = {
  isActive: false,
  progress: 0,
  documentsFound: 0,
  status: 'idle',
  message: 'Background sync disabled to prevent unlimited API calls'
};

export function useBackgroundProgress() {
  const [progressData, setProgressData] = useState<ProgressData>(staticProgressData);

  // NO POLLING - just return static data
  useEffect(() => {
    console.log('🚫 Background progress polling disabled to prevent unlimited API calls');
  }, []);

  return progressData;
}

// Export for manual control if needed
export const backgroundProgressManager = {
  startPolling: () => console.log('🚫 Polling disabled'),
  stopPolling: () => console.log('🚫 Polling disabled'),
  getCurrentData: () => staticProgressData,
  forceUpdate: () => console.log('🚫 Updates disabled')
};
