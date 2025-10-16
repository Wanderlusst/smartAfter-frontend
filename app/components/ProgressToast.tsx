'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useBackgroundProgress } from '@/app/hooks/useBackgroundProgress';

export default function ProgressToast() {
  const progressData = useBackgroundProgress();
  const [lastProgress, setLastProgress] = useState(progressData);
  const [toastId, setToastId] = useState<string | number | null>(null);
  const lastProgressRef = useRef(progressData);

  useEffect(() => {
    // Skip processing if no active sync and we already have the last state
    if (!progressData.isActive && lastProgressRef.current && !lastProgressRef.current.isActive) {
      return;
    }
    
    // Only show toast if status changed or progress updated significantly
    if (progressData.isActive && progressData.status === 'syncing') {
      if (!lastProgressRef.current || lastProgressRef.current.status !== 'syncing' || Math.abs(progressData.progress - (lastProgressRef.current.progress || 0)) > 10) {
        // Dismiss previous toast if exists
        if (toastId) {
          toast.dismiss(toastId);
        }
        
        // Show new progress toast
        console.log('🍞 ProgressToast - Showing loading toast');
        const id = toast.loading(
          `Syncing 3 months of data... ${progressData.documentsFound} docs processed`,
          {
            description: `${progressData.progress}% complete - ${progressData.message}`,
            duration: Infinity, // Keep showing until dismissed
          }
        );
        setToastId(id);
      }
    } else if (progressData.status === 'success' && lastProgressRef.current?.status === 'syncing') {
      // Dismiss loading toast and show success
      if (toastId) {
        toast.dismiss(toastId);
      }
      
      toast.success(
        `3-month sync completed! ${progressData.documentsFound} documents processed`,
        {
          description: 'Your financial data is now up to date',
          duration: 3000,
        }
      );
      setToastId(null);
    } else if (progressData.status === 'error' && lastProgressRef.current?.status === 'syncing') {
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
    
    lastProgressRef.current = progressData;
    setLastProgress(progressData);
  }, [progressData, toastId]);

  // This component doesn't render anything - it just manages toasts
  return null;
}
