'use client';

import React from 'react';
import { motion } from 'framer-motion';

// Shimmer effect component
const Shimmer = () => (
  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
);

// Skeleton card component
const SkeletonCard = ({ className = '' }: { className?: string }) => (
  <div className={`relative overflow-hidden backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl ${className}`}>
    <Shimmer />
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
        <div className="w-12 h-12 bg-white/10 rounded-xl animate-pulse" />
      </div>
      <div className="h-8 w-20 bg-white/10 rounded animate-pulse mb-2" />
      <div className="h-3 w-16 bg-white/10 rounded animate-pulse" />
    </div>
  </div>
);

// Modern loading spinner
const LoadingSpinner = ({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <motion.div
        className={`${sizeClasses[size]} border-2 border-white/20 border-t-white/60 rounded-full`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
};

// Dashboard skeleton loader
export const DashboardSkeleton = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-cyan-900/20 animate-pulse" />
      
      {/* Sticky Top Bar Skeleton */}
      <motion.div 
        className="sticky top-0 z-50 backdrop-blur-xl bg-white/5 border-b border-white/10"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl animate-pulse" />
            <div>
              <div className="h-6 w-32 bg-white/10 rounded animate-pulse mb-1" />
              <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
            <div className="w-8 h-8 bg-white/10 rounded-full animate-pulse" />
          </div>
        </div>
      </motion.div>

      <div className="p-6 space-y-6">
        {/* Hero Section Skeleton */}
        <motion.div 
          className="text-center space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="h-8 w-64 bg-white/10 rounded animate-pulse mx-auto mb-2" />
          <div className="h-4 w-96 bg-white/10 rounded animate-pulse mx-auto" />
        </motion.div>

        {/* Stats Grid Skeleton */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </motion.div>

        {/* Charts Section Skeleton */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="relative overflow-hidden backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl">
              <Shimmer />
              <div className="p-6">
                <div className="h-6 w-48 bg-white/10 rounded animate-pulse mb-4" />
                <div className="h-80 bg-white/10 rounded-xl animate-pulse" />
              </div>
            </div>
          ))}
        </motion.div>

        {/* Quick Actions Skeleton */}
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <div className="h-6 w-32 bg-white/10 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-white/10 rounded-xl animate-pulse" />
            ))}
          </div>
        </motion.div>

        {/* Recent Activity Skeleton */}
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
        >
          <div className="h-6 w-32 bg-white/10 rounded animate-pulse" />
          <div className="relative overflow-hidden backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl">
            <Shimmer />
            <div className="p-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-white/20 rounded-full" />
                    <div>
                      <div className="h-4 w-32 bg-white/10 rounded animate-pulse mb-1" />
                      <div className="h-3 w-16 bg-white/10 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Page loading spinner
export const PageLoadingSpinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
    <div className="text-center space-y-4">
      <LoadingSpinner size="lg" />
      <p className="text-white/60 text-sm">Loading your dashboard...</p>
    </div>
  </div>
);

// Inline loading spinner
export const InlineSpinner = ({ text = 'Loading...' }: { text?: string }) => (
  <div className="flex items-center gap-2 text-white/60">
    <LoadingSpinner size="sm" />
    <span className="text-sm">{text}</span>
  </div>
);

export default LoadingSpinner; 