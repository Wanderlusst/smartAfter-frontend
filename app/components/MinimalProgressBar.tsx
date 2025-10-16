'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBackgroundProgress } from '@/app/hooks/useBackgroundProgress';

export default function MinimalProgressBar() {
  const progressData = useBackgroundProgress();

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
