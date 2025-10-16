"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface SyncStatus {
  isActive: boolean;
  progress: number;
  message: string;
  status: 'idle' | 'syncing' | 'success' | 'error';
  documentsFound: number;
  lastSyncTime?: string;
}

interface BackgroundSyncIndicatorProps {
  className?: string;
}

export default function BackgroundSyncIndicator({ className = '' }: BackgroundSyncIndicatorProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isActive: false,
    progress: 0,
    message: 'Checking for new emails...',
    status: 'idle',
    documentsFound: 0
  });

  useEffect(() => {
    // Listen for background job updates
    const checkBackgroundStatus = async () => {
      try {
        // Check if background job is running
        const response = await fetch('/api/background-progress');
        if (response.ok) {
          const data = await response.json();
          setSyncStatus(prev => ({
            ...prev,
            isActive: data.isActive || false,
            progress: data.progress || 0,
            message: data.message || 'Processing emails...',
            status: data.status || 'idle',
            documentsFound: data.documentsFound || 0
          }));
        }
      } catch (error) {
        console.log('Background status check failed:', error);
      }
    };

    // Check every 5 seconds (reduced frequency)
    const interval = setInterval(checkBackgroundStatus, 5000);
    
    // Initial check
    checkBackgroundStatus();

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    switch (syncStatus.status) {
      case 'syncing':
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (syncStatus.status) {
      case 'syncing':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950';
      case 'success':
        return 'border-green-500 bg-green-50 dark:bg-green-950';
      case 'error':
        return 'border-red-500 bg-red-50 dark:bg-red-950';
      default:
        return 'border-gray-300 bg-gray-50 dark:bg-gray-800';
    }
  };

  if (!syncStatus.isActive && syncStatus.status === 'idle') {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`fixed top-4 right-4 z-50 max-w-sm ${className}`}
      >
        <div className={`rounded-lg border-2 p-4 shadow-lg ${getStatusColor()}`}>
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Background Sync
                </h4>
                <span className="text-xs text-gray-500">
                  {syncStatus.documentsFound} found
                </span>
              </div>
              
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {syncStatus.message}
              </p>
              
              {syncStatus.isActive && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{syncStatus.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <motion.div
                      className="bg-blue-500 h-1.5 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${syncStatus.progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
