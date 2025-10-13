'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ArrowRight, Inbox } from 'lucide-react';

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease';
  icon?: React.ReactNode;
  subtitle?: string;
  alert?: string;
  alertType?: 'warning' | 'info' | 'success';
  onClick?: () => void;
  className?: string;
  isEmpty?: boolean;
}

export default function AnalyticsCard({
  title,
  value,
  change,
  changeType = 'increase',
  icon,
  subtitle,
  alert,
  alertType = 'info',
  onClick,
  className = '',
  isEmpty = false
}: AnalyticsCardProps) {
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0
    },
    hover: {
      y: -1
    }
  };

  const iconVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1
    },
    hover: {
      scale: 1.05
    }
  };

  const valueVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0
    }
  };

  const trendVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1
    }
  };

  const getAlertIcon = () => {
    switch (alertType) {
      case 'warning':
        return <TrendingDown className="w-4 h-4 text-yellow-600" />;
      case 'success':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      default:
        return <TrendingUp className="w-4 h-4 text-blue-600" />;
    }
  };

  const getAlertColor = () => {
    switch (alertType) {
      case 'warning':
        return 'text-yellow-700 dark:text-yellow-400';
      case 'success':
        return 'text-green-700 dark:text-green-400';
      default:
        return 'text-blue-700 dark:text-blue-400';
    }
  };

  if (isEmpty) {
    return (
              <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className={`bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-lg p-6 shadow-sm ${className}`}
        >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Icon */}
            <motion.div
              variants={iconVariants}
              whileHover="hover"
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-4"
            >
              <div className="text-gray-400 dark:text-gray-500">
                {icon || <Inbox className="w-5 h-5" />}
              </div>
            </motion.div>

            {/* Title */}
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              {title}
            </h3>

            {/* Empty State */}
            <motion.div
              variants={valueVariants}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="text-2xl font-bold text-gray-400 dark:text-gray-500 mb-2"
            >
              No data
            </motion.div>

            {/* Subtitle */}
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                {subtitle}
              </p>
            )}

            {/* Empty Message */}
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Connect your accounts to see data
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={`bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-400 cursor-pointer ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Icon */}
          {icon && (
            <motion.div
              variants={iconVariants}
              whileHover="hover"
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4"
            >
              <div className="text-blue-600 dark:text-blue-400">
                {icon}
              </div>
            </motion.div>
          )}

          {/* Title */}
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            {title}
          </h3>

          {/* Value */}
          <motion.div
            variants={valueVariants}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2"
          >
            {value}
          </motion.div>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {subtitle}
            </p>
          )}

          {/* Change Indicator */}
          {change !== undefined && (
                      <motion.div
            variants={trendVariants}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="flex items-center gap-2 mb-3"
          >
              <div className={`flex items-center gap-1 text-sm font-medium ${
                changeType === 'increase' 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {changeType === 'increase' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {Math.abs(change)}%
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                vs last month
              </span>
            </motion.div>
          )}

          {/* Alert */}
          {alert && (
            <div className="flex items-center gap-2 text-sm">
              {getAlertIcon()}
              <span className={getAlertColor()}>
                {alert}
              </span>
            </div>
          )}
        </div>

        {/* Action Arrow */}
        {onClick && (
                  <motion.div
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          whileHover={{ x: 1 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
            <ArrowRight className="w-5 h-5" />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
} 