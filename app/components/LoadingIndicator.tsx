"use client";

import React from 'react';

interface LoadingIndicatorProps {
  isLoading: boolean;
  message?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  isLoading, 
  message = "Processing..." 
}) => {
  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/50">
      <div className="flex items-center justify-center py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-200 rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-200">{message}</span>
        </div>
      </div>
    </div>
  );
};

export default LoadingIndicator;
