'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  X,
  RefreshCw
} from 'lucide-react';

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

interface BackgroundProgressIndicatorProps {
  onJobComplete?: (results: any[]) => void;
}

export default function BackgroundProgressIndicator({ onJobComplete }: BackgroundProgressIndicatorProps) {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
        if (completedJobs.length > 0 && onJobComplete) {
          completedJobs.forEach(job => {
            if (job.results) {
              onJobComplete(job.results);
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

  // Clear completed jobs
  const clearCompletedJobs = async () => {
    try {
      await fetch('/api/background-worker', {
        method: 'DELETE',
      });
      setJobs([]);
      setIsVisible(false);
    } catch (error) {
      console.error('Error clearing jobs:', error);
    }
  };

  // Poll for updates every 2 seconds
  useEffect(() => {
    const interval = setInterval(fetchJobStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  // Format duration
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
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
    return (
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => startBackgroundJob(90)}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {isLoading ? 'Starting...' : 'Fetch 3 Months'}
        </button>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 left-4 right-4 z-50"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Background Email Processing
                </h3>
              </div>
              <button
                onClick={clearCompletedJobs}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {jobs.map((job) => (
              <div key={job.jobId} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(job.status)}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {job.status === 'running' ? 'Processing emails...' : 
                       job.status === 'completed' ? 'Completed' : 
                       job.status === 'failed' ? 'Failed' : 'Paused'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDuration(job.duration)}
                  </span>
                </div>
                
                {job.status === 'running' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>{job.processedEmails} of {job.totalEmails} emails</span>
                      <span>{job.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <motion.div
                        className={`h-2 rounded-full ${getStatusColor(job.status)}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${job.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}
                
                {job.status === 'completed' && (
                  <div className="text-sm text-green-600 dark:text-green-400">
                    ✅ Processed {job.processedEmails} emails successfully
                  </div>
                )}
                
                {job.status === 'failed' && job.error && (
                  <div className="text-sm text-red-600 dark:text-red-400">
                    ❌ Error: {job.error}
                  </div>
                )}
              </div>
            ))}
            
            {jobs.length === 0 && (
              <div className="text-center py-4">
                <button
                  onClick={() => startBackgroundJob(90)}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 mx-auto"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {isLoading ? 'Starting...' : 'Start 3-Month Fetch'}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

