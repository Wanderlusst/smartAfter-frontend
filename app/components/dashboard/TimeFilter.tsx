'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  Zap, 
  ChevronDown
} from 'lucide-react';
import { Button } from '../ui/button';

export interface TimeFilter {
  id: string;
  label: string;
  days: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const TIME_FILTERS: TimeFilter[] = [
  {
    id: '7d',
    label: '7 Days',
    days: 7,
    description: 'Recent data',
    icon: Clock,
    color: 'text-blue-400'
  },
  {
    id: '14d',
    label: '14 Days',
    days: 14,
    description: 'Short-term',
    icon: TrendingUp,
    color: 'text-blue-500'
  },
  {
    id: '1m',
    label: '1 Month',
    days: 30,
    description: 'Monthly view',
    icon: Calendar,
    color: 'text-blue-600'
  },
  {
    id: '3m',
    label: '3 Months',
    days: 90,
    description: 'Quarterly',
    icon: Zap,
    color: 'text-blue-700'
  },
  {
    id: '6m',
    label: '6 Months',
    days: 180,
    description: 'Long-term',
    icon: TrendingUp,
    color: 'text-blue-800'
  },
  {
    id: '1y',
    label: '1 Year',
    days: 365,
    description: 'Annual',
    icon: Calendar,
    color: 'text-blue-900'
  }
];

interface TimeFilterProps {
  currentFilter: TimeFilter;
  onFilterChange: (filter: TimeFilter) => void;
  className?: string;
  compact?: boolean;
}

export default function TimeFilter({ 
  currentFilter, 
  onFilterChange, 
  className = '',
  compact = false 
}: TimeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleFilterSelect = (filter: TimeFilter) => {
    onFilterChange(filter);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Filter Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        size={compact ? "sm" : "default"}
        className="flex items-center gap-2 border-gray-600 text-gray-200 bg-gray-900/20 hover:bg-gray-800/30"
      >
        <currentFilter.icon className="w-4 h-4 text-blue-400" />
        <span className={compact ? "text-sm" : "text-base"}>
          {currentFilter.label}
        </span>
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.2 }}
          className="absolute top-full mt-2 right-0 w-64 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl z-50"
        >
          <div className="p-3">
            <div className="text-sm font-medium text-gray-300 mb-3 px-2">
              Select Time Range
            </div>
            
            <div className="space-y-1">
              {TIME_FILTERS.map((filter) => (
                <motion.div
                  key={filter.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`cursor-pointer p-3 rounded-lg transition-all duration-200 ${
                    currentFilter.id === filter.id
                      ? 'bg-blue-600/20 border border-blue-500/50'
                      : 'hover:bg-gray-800/50'
                  }`}
                  onClick={() => handleFilterSelect(filter)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      currentFilter.id === filter.id 
                        ? 'bg-blue-600/30 border border-blue-500/50' 
                        : 'bg-gray-700/50'
                    }`}>
                      <filter.icon className={`w-4 h-4 ${filter.color}`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-100">
                        {filter.label}
                      </div>
                      <div className="text-xs text-gray-400">
                        {filter.description}
                      </div>
                    </div>
                    
                    {currentFilter.id === filter.id && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
