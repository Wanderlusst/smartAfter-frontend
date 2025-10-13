"use client";

import React from 'react';
import { Card, CardContent } from '../ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  gradient?: string;
  percentage?: string;
  onClick?: () => void;
  href?: string;
  className?: string;
  isLoading?: boolean;
  error?: any;
}

const DashboardCard = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  gradient = 'from-blue-500 to-blue-600',
  percentage,
  onClick,
  href,
  className = '',
  isLoading = false,
  error
}: DashboardCardProps) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      window.location.href = href;
    }
  };

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString();
    }
    return val;
  };

  const CardComponent = href ? 'a' : 'div';
  const cardProps = href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className={`relative overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-sm ${className}`}
        onClick={handleClick}
      >
        {/* Gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-10`} />
        
        <CardContent className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              {icon && (
                <span className="text-2xl">{icon}</span>
              )}
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {title}
              </h3>
            </div>
            {trend && (
              <div className="flex items-center space-x-1">
                {getTrendIcon()}
                {percentage && (
                  <span className={`text-xs font-medium ${getTrendColor()}`}>
                    {percentage}
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isLoading ? (
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ) : error ? (
                <span className="text-red-500">Error</span>
              ) : (
                formatValue(value)
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DashboardCard; 