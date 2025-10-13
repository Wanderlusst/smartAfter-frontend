'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  Zap, 
  CheckCircle,
  RefreshCw,
  X
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface SyncFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: (filter: SyncFilter) => void;
  currentFilter: SyncFilter;
  isSyncing: boolean;
}

export interface SyncFilter {
  id: string;
  label: string;
  days: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const SYNC_FILTERS: SyncFilter[] = [
  {
    id: '7d',
    label: '7 Days',
    days: 7,
    description: 'Recent purchases & quick insights',
    icon: Clock,
    color: 'text-blue-400'
  },
  {
    id: '14d',
    label: '14 Days',
    days: 14,
    description: 'Short-term spending patterns',
    icon: TrendingUp,
    color: 'text-blue-500'
  },
  {
    id: '1m',
    label: '1 Month',
    days: 30,
    description: 'Monthly overview & trends',
    icon: Calendar,
    color: 'text-blue-600'
  },
  {
    id: '3m',
    label: '3 Months',
    days: 90,
    description: 'Quarterly analysis & insights',
    icon: Zap,
    color: 'text-blue-700'
  },
  {
    id: '6m',
    label: '6 Months',
    days: 180,
    description: 'Long-term patterns & growth',
    icon: TrendingUp,
    color: 'text-blue-800'
  },
  {
    id: '1y',
    label: '1 Year',
    days: 365,
    description: 'Annual overview & trends',
    icon: Calendar,
    color: 'text-blue-900'
  }
];

export default function SyncFilterModal({ 
  isOpen, 
  onClose, 
  onApplyFilter, 
  currentFilter,
  isSyncing 
}: SyncFilterModalProps) {
  const [selectedFilter, setSelectedFilter] = useState<SyncFilter>(currentFilter);

  const handleApply = () => {
    onApplyFilter(selectedFilter);
    onClose();
  };

  const handleClose = () => {
    if (!isSyncing) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        
        {/* Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
                <RefreshCw className={`w-5 h-5 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-100">
                  Sync Data Filter
                </h3>
                <p className="text-sm text-gray-400">
                  Choose time range for data sync
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isSyncing}
              className="text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 rounded-xl"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Current Filter Display */}
            <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-sm font-medium text-gray-300">Current Filter</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600/20`}>
                  <currentFilter.icon className={`w-4 h-4 ${currentFilter.color}`} />
                </div>
                <div>
                  <div className="text-base font-semibold text-gray-100">
                    {currentFilter.label}
                  </div>
                  <div className="text-sm text-gray-400">
                    {currentFilter.description}
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Options */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-300 mb-3">
                Select Time Range
              </h4>
              
              {SYNC_FILTERS.map((filter) => (
                <motion.div
                  key={filter.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative cursor-pointer p-4 rounded-xl border transition-all duration-200 ${
                    selectedFilter.id === filter.id
                      ? 'bg-blue-600/20 border-blue-500/50 shadow-lg shadow-blue-500/10'
                      : 'bg-gray-800/30 border-gray-700/50 hover:bg-gray-800/50 hover:border-gray-600/50'
                  }`}
                  onClick={() => setSelectedFilter(filter)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      selectedFilter.id === filter.id 
                        ? 'bg-blue-600/30 border border-blue-500/50' 
                        : 'bg-gray-700/50'
                    }`}>
                      <filter.icon className={`w-5 h-5 ${filter.color}`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="text-base font-semibold text-gray-100">
                        {filter.label}
                      </div>
                      <div className="text-sm text-gray-400">
                        {filter.description}
                      </div>
                    </div>
                    
                    {selectedFilter.id === filter.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center"
                      >
                        <CheckCircle className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 p-6 border-t border-gray-700/50">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSyncing}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800/50 hover:text-gray-100"
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleApply}
              disabled={isSyncing}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Apply Filter
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
