'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface ProgressData {
  isActive: boolean;
  progress: number;
  documentsFound: number;
  status: 'idle' | 'syncing' | 'success' | 'error';
  message: string;
}

export default function ProgressToast() {
  const [lastProgress, setLastProgress] = useState<ProgressData | null>(null);
  const [toastId, setToastId] = useState<string | number | null>(null);

  // Check progress from API
  const checkProgress = async () => {
    try {
      const response = await fetch('/api/background-progress');
      if (response.ok) {
        const data = await response.json();
        console.log('🍞 ProgressToast - API data:', data);
        
        // Only show toast if status changed or progress updated significantly
        if (data.isActive && data.status === 'syncing') {
          if (!lastProgress || lastProgress.status !== 'syncing' || Math.abs(data.progress - (lastProgress.progress || 0)) > 10) {
            // Dismiss previous toast if exists
            if (toastId) {
              toast.dismiss(toastId);
            }
            
            // Show new progress toast
            console.log('🍞 ProgressToast - Showing loading toast');
            const id = toast.loading(
              `Syncing 3 months of data... ${data.documentsFound} docs processed`,
              {
                description: `${data.progress}% complete - ${data.message}`,
                duration: Infinity, // Keep showing until dismissed
              }
            );
            setToastId(id);
          }
        } else if (data.status === 'success' && lastProgress?.status === 'syncing') {
          // Dismiss loading toast and show success
          if (toastId) {
            toast.dismiss(toastId);
          }
          
          toast.success(
            `3-month sync completed! ${data.documentsFound} documents processed`,
            {
              description: 'Your financial data is now up to date',
              duration: 3000,
            }
          );
          setToastId(null);
        } else if (data.status === 'error' && lastProgress?.status === 'syncing') {
          // Dismiss loading toast and show error
          if (toastId) {
            toast.dismiss(toastId);
          }
          
          toast.error('Sync failed', {
            description: 'There was an error syncing your data',
            duration: 5000,
          });
          setToastId(null);
        }
        
        setLastProgress(data);
      }
    } catch (error) {
      // Silently fail - don't show errors for background progress
    }
  };

  useEffect(() => {
    // Check initial status
    checkProgress();
    
    // Check every 2 seconds
    const interval = setInterval(checkProgress, 2000);

    return () => clearInterval(interval);
  }, [lastProgress]);

  // This component doesn't render anything - it just manages toasts
  return null;
}
