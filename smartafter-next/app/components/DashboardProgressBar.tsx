'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { useBackgroundData } from '@/app/hooks/useBackgroundData';

interface ProgressData {
  isRunning: boolean;
  progress: number;
  totalEmails: number;
  processedEmails: number;
  status: 'idle' | 'running' | 'completed' | 'failed';
  message: string;
  results?: any[];
}

export default function DashboardProgressBar() {
  const [progressData, setProgressData] = useState<ProgressData>({
    isRunning: false,
    progress: 0,
    totalEmails: 0,
    processedEmails: 0,
    status: 'idle',
    message: ''
  });
  
  const { handleBackgroundJobComplete } = useBackgroundData();

  // No longer checking localStorage - using Supabase for persistence
  const checkProgress = () => {
    try {
      // No longer loading from localStorage
      const storedJob = null;
      if (storedJob) {
        const job = JSON.parse(storedJob);
        setProgressData({
          isRunning: job.status === 'running',
          progress: job.progress || 0,
          totalEmails: job.totalEmails || 0,
          processedEmails: job.processedEmails || 0,
          status: job.status || 'idle',
          message: job.status === 'running' ? 
            `Processing emails... ${job.processedEmails}/${job.totalEmails}` :
            job.status === 'completed' ? 
              `Completed - ${job.processedEmails} documents processed` :
              job.status === 'failed' ? 
                `Failed - ${job.error}` : '',
          results: job.results
        });
        
        // Handle completed job results - only process if not already processed
        if (job.status === 'completed' && job.results && job.results.length > 0 && !job.resultsProcessed) {
          console.log('🎉 Background job completed with results:', job.results.length);
          handleBackgroundJobComplete(job.results);
        }
      }
    } catch (error) {
      console.error('Error checking progress:', error);
    }
  };

  // Listen for background job updates
  useEffect(() => {
    // Check initial status
    checkProgress();
    
    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'backgroundJob') {
        checkProgress();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Check periodically
    const interval = setInterval(checkProgress, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);


  if (!progressData.isRunning && progressData.status === 'idle') {
    return null; // Don't show anything if no job is running
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mb-4 p-3 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {progressData.status === 'running' && (
                <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
              )}
              {progressData.status === 'completed' && (
                <CheckCircle className="h-4 w-4 text-green-400" />
              )}
              {progressData.status === 'failed' && (
                <AlertCircle className="h-4 w-4 text-red-400" />
              )}
              <Database className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-white">
                Background Data Sync
              </span>
            </div>
            
            {progressData.status === 'running' && (
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <span>{progressData.processedEmails} of {progressData.totalEmails}</span>
                <span>•</span>
                <span>{progressData.progress}%</span>
              </div>
            )}
            
            {progressData.status === 'completed' && (
              <span className="text-xs text-green-400">
                ✅ Completed - {progressData.processedEmails} documents processed
              </span>
            )}
            
            {progressData.status === 'failed' && (
              <span className="text-xs text-red-400">
                ❌ Failed - {progressData.message}
              </span>
            )}
          </div>
          
          {/* Progress bar for running jobs */}
          {progressData.status === 'running' && (
            <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressData.progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}
        </div>
        
        {progressData.message && (
          <div className="mt-2 text-xs text-gray-400">
            {progressData.message}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
