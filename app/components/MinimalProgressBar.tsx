'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProgressData {
  isActive: boolean;
  progress: number;
  documentsFound: number;
  status: 'idle' | 'syncing' | 'success' | 'error';
  message: string;
}

export default function MinimalProgressBar() {
  const [progressData, setProgressData] = useState<ProgressData>({
    isActive: false,
    progress: 0,
    documentsFound: 0,
    status: 'idle',
    message: ''
  });

  // Check progress from API
  const checkProgress = async () => {
    try {
      const response = await fetch('/api/background-progress');
      if (response.ok) {
        const data = await response.json();
        setProgressData({
          isActive: data.isActive || false,
          progress: data.progress || 0,
          documentsFound: data.documentsFound || 0,
          status: data.status || 'idle',
          message: data.message || ''
        });
      }
    } catch (error) {
      // Silently fail - don't show errors for background progress
    }
  };

  useEffect(() => {
    // Check initial status
    checkProgress();
    
    // Check every 5 seconds (reduced frequency)
    const interval = setInterval(checkProgress, 5000);

    return () => clearInterval(interval);
  }, []);

  // Don't show if not active or completed
  if (!progressData.isActive && progressData.status !== 'syncing') {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        className="mb-4"
      >
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Syncing 3 months of data...
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400">
                {progressData.documentsFound} docs
              </span>
            </div>
            
            {/* Minimal progress bar */}
            <div className="w-24 h-1.5 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-blue-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progressData.progress, 100)}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
