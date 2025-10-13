"use client";
import React from 'react';
import { Card, CardContent } from '../ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
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
}

const StatsCard = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  gradient = 'from-blue-500 to-blue-600',
  percentage,
  onClick,
  href,
  className = ''
}: StatsCardProps) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4" />;
      case 'down': return <TrendingDown className="w-4 h-4" />;
      default: return <Minus className="w-4 h-4" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20';
      case 'down': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50';
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      window.location.href = href;
    }
  };

  const isClickable = onClick || href;

  return (
    <Card 
      className={`group bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:shadow-gray-200/20 dark:hover:shadow-gray-900/20 hover:scale-[1.02] transition-all duration-300 ${
        isClickable ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={isClickable ? handleClick : undefined}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <span className="text-xl filter drop-shadow-sm">{icon}</span>
          </div>
          {trend && percentage && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${getTrendColor()}`}>
              {getTrendIcon()}
              <span>{percentage}</span>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{value}</h3>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
