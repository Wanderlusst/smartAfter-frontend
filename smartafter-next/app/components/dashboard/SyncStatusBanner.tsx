'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  ArrowUpRight
} from 'lucide-react';

interface SyncStatus {
  isChecking: boolean;
  isAutoSync: boolean;
  error: string | null;
  progress: number;
  message: string;
  lastSync: string;
  nextSync: string;
}

interface SyncStatusBannerProps {
  syncStatus: SyncStatus;
  onForceSync: () => void;
  onRetry: () => void;
  className?: string;
}

const getStatusColor = (status: SyncStatus) => {
  if (status.error) return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
  if (status.isChecking) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
  return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
};

const getStatusIcon = (status: SyncStatus) => {
  if (status.error) return <WifiOff className="h-4 w-4" />;
  if (status.isChecking) return <RefreshCw className="h-4 w-4 animate-spin" />;
  return <Wifi className="h-4 w-4" />;
};

const getStatusText = (status: SyncStatus) => {
  if (status.error) return 'Sync Error';
  if (status.isChecking) return 'Syncing...';
  return 'Synced';
};

export default function SyncStatusBanner({
  syncStatus,
  onForceSync,
  onRetry,
  className = ''
}: SyncStatusBannerProps) {
  const bannerVariants = {
    hidden: { opacity: 0, y: -20, height: 0 },
    visible: { 
      opacity: 1, 
      y: 0, 
      height: 'auto'
    },
    exit: { 
      opacity: 0, 
      y: -20, 
      height: 0
    }
  };

  const progressVariants = {
    hidden: { width: 0 },
    visible: { 
      width: `${syncStatus.progress}%`
    }
  };

  const formatLastSync = (timestamp: string) => {
    if (!timestamp) return 'Never';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
      
      return date.toLocaleDateString();
    } catch (error) {
      return 'Unknown';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        variants={bannerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`${className}`}
      >
        <Card className="glass-enhanced border-0 shadow-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Status Icon */}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className={`p-2 rounded-full ${getStatusColor(syncStatus)}`}
                >
                  {getStatusIcon(syncStatus)}
                </motion.div>

                {/* Status Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-foreground">
                      {getStatusText(syncStatus)}
                    </h4>
                    {syncStatus.isAutoSync && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        Auto
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Last sync: {formatLastSync(syncStatus.lastSync)}</span>
                    </div>
                    {syncStatus.nextSync && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Next sync: {syncStatus.nextSync}</span>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {syncStatus.isChecking && syncStatus.progress > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Syncing...</span>
                        <span className="font-medium">{syncStatus.progress}%</span>
                      </div>
                      <div className="w-full bg-muted/20 rounded-full h-2 overflow-hidden">
                        <motion.div
                          variants={progressVariants}
                          initial="hidden"
                          animate="visible"
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                        />
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {syncStatus.error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 flex items-center gap-2 text-xs text-red-600"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      <span>{syncStatus.error}</span>
                    </motion.div>
                  )}

                  {/* Status Message */}
                  {syncStatus.message && !syncStatus.error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <CheckCircle className="h-3 w-3" />
                      <span>{syncStatus.message}</span>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {syncStatus.error ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onRetry}
                    className="glass-button text-red-600 hover:text-red-700"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Retry
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onForceSync}
                    disabled={syncStatus.isChecking}
                    className="glass-button"
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${syncStatus.isChecking ? 'animate-spin' : ''}`} />
                    {syncStatus.isChecking ? 'Syncing...' : 'Sync Now'}
                  </Button>
                )}

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-1 rounded-full bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </motion.div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
} 