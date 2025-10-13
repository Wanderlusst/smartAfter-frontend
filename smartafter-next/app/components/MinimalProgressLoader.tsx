'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useBackgroundData } from '@/app/hooks/useBackgroundData';

interface BackgroundJob {
  jobId: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  totalEmails: number;
  processedEmails: number;
  startTime: number;
  endTime?: number;
  error?: string;
  duration: number;
}

interface MinimalProgressLoaderProps {
  onJobComplete?: (results: any[]) => void;
  autoStart?: boolean;
}

export default function MinimalProgressLoader({ onJobComplete, autoStart = true }: MinimalProgressLoaderProps) {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { handleBackgroundJobComplete } = useBackgroundData();

  // Fetch job status
  const fetchJobStatus = async () => {
    try {
      const response = await fetch('/api/background-worker');
      if (response.ok) {
        const data = await response.json();
        const activeJobs = data.jobs.filter((job: BackgroundJob) => 
          job.status === 'running' || job.status === 'completed'
        );
        setJobs(activeJobs);
        setIsVisible(activeJobs.length > 0);
        
        // Check for completed jobs
        const completedJobs = activeJobs.filter((job: BackgroundJob) => job.status === 'completed');
        if (completedJobs.length > 0) {
          completedJobs.forEach(job => {
            if (job.results) {
              // Use the background data hook to handle results
              handleBackgroundJobComplete(job.results);
              
              // Also call the optional callback if provided
              if (onJobComplete) {
                onJobComplete(job.results);
              }
            }
          });
        }
      }
    } catch (error) {
      console.error('Error fetching job status:', error);
    }
  };

  // Start background job
  const startBackgroundJob = async (days: number = 90) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/background-worker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ days }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Background job started:', data.jobId);
        // Start polling for updates
        setTimeout(fetchJobStatus, 1000);
      }
    } catch (error) {
      console.error('Error starting background job:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-start background job after initial load
  useEffect(() => {
    if (autoStart) {
      // Wait 3 seconds after component mount, then start background job
      const timer = setTimeout(() => {
        startBackgroundJob(90);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [autoStart]);

  // Poll for updates every 2 seconds
  useEffect(() => {
    const interval = setInterval(fetchJobStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (!isVisible && jobs.length === 0) {
    return null; // Don't show anything if no jobs
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700"
        >
          <div className="px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(jobs[0]?.status || 'running')}
                  <span className="text-sm font-medium text-white">
                    Background Email Processing
                  </span>
                </div>
                
                {jobs[0]?.status === 'running' && (
                  <div className="flex items-center gap-2 text-xs text-gray-300">
                    <span>{jobs[0].processedEmails} of {jobs[0].totalEmails}</span>
                    <span>•</span>
                    <span>{jobs[0].progress}%</span>
                  </div>
                )}
                
                {jobs[0]?.status === 'completed' && (
                  <span className="text-xs text-green-400">
                    ✅ Completed - {jobs[0].processedEmails} documents processed
                  </span>
                )}
                
                {jobs[0]?.status === 'failed' && (
                  <span className="text-xs text-red-400">
                    ❌ Failed - {jobs[0].error}
                  </span>
                )}
              </div>
              
              {/* Progress bar for running jobs */}
              {jobs[0]?.status === 'running' && (
                <div className="w-32 h-1 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${getStatusColor(jobs[0].status)}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${jobs[0].progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
