'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Zap, Clock, AlertCircle } from 'lucide-react';
import { LoadingState, loadingVariants } from '@/app/lib/routePerformance';

interface RouteLoadingIndicatorProps {
  loadingState: LoadingState;
  currentRoute: string;
  isVisible: boolean;
}

const LoadingIcon = ({ state }: { state: LoadingState }) => {
  switch (state) {
    case 'fast':
      return <Zap className="w-4 h-4 text-green-500" />;
    case 'medium':
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case 'slow':
      return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />;
    case 'very-slow':
      return <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />;
    default:
      return null;
  }
};

const LoadingMessage = ({ state, route }: { state: LoadingState; route: string }) => {
  const routeName = route.split('/').pop() || 'page';
  
  switch (state) {
    case 'fast':
      return <span className="text-green-600 text-sm">Loading {routeName}...</span>;
    case 'medium':
      return <span className="text-blue-600 text-sm">Loading {routeName}...</span>;
    case 'slow':
      return <span className="text-yellow-600 text-sm">Loading {routeName} (this may take a moment)...</span>;
    case 'very-slow':
      return <span className="text-red-600 text-sm">Loading {routeName} (processing large data)...</span>;
    default:
      return null;
  }
};

const LoadingProgress = ({ state }: { state: LoadingState }) => {
  const progress = {
    fast: 20,
    medium: 40,
    slow: 70,
    'very-slow': 90
  }[state];

  return (
    <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  );
};

export default function RouteLoadingIndicator({ 
  loadingState, 
  currentRoute, 
  isVisible 
}: RouteLoadingIndicatorProps) {
  if (!isVisible || loadingState === 'idle') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 min-w-[200px]"
      >
        <div className="flex items-center space-x-3">
          <motion.div
            variants={loadingVariants}
            animate={loadingState}
            className="flex-shrink-0"
          >
            <LoadingIcon state={loadingState} />
          </motion.div>
          
          <div className="flex-1 min-w-0">
            <LoadingMessage state={loadingState} route={currentRoute} />
            <div className="mt-2">
              <LoadingProgress state={loadingState} />
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Full-screen loading overlay for very slow routes
export function FullScreenLoadingOverlay({ 
  loadingState, 
  currentRoute 
}: { 
  loadingState: LoadingState; 
  currentRoute: string; 
}) {
  if (loadingState !== 'very-slow') return null;

  const routeName = currentRoute.split('/').pop() || 'page';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md w-full mx-4"
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-4"
          >
            <Loader2 className="w-16 h-16 text-blue-500" />
          </motion.div>
          
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Loading {routeName}
          </h3>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Processing large amounts of data. This may take a moment...
          </p>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <motion.div
              className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 3, ease: "easeOut" }}
            />
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Please wait while we optimize your data...
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Inline loading spinner for medium/slow routes
export function InlineLoadingSpinner({ 
  loadingState, 
  size = 'sm' 
}: { 
  loadingState: LoadingState; 
  size?: 'sm' | 'md' | 'lg';
}) {
  if (loadingState === 'idle' || loadingState === 'fast') return null;

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="flex items-center justify-center"
    >
      <Loader2 className={`${sizeClasses[size]} text-blue-500 animate-spin`} />
    </motion.div>
  );
}
