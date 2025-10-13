import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface OverviewCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  gradient?: string;
  percentage?: string;
  onClick?: () => void;
  href?: string;
}

const OverviewCard = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  gradient = 'from-slate-500 to-slate-600',
  percentage,
  onClick,
  href
}: OverviewCardProps) => {
  const router = useRouter();

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
      default: return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50';
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href);
    }
  };

  const isClickable = onClick || href;

  return (
    <div 
      className={`group bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-slate-900/20 hover:scale-[1.02] transition-all duration-300 ${
        isClickable ? 'cursor-pointer' : ''
      }`}
      onClick={isClickable ? handleClick : undefined}
    >
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
        <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{value}</h3>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</p>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default OverviewCard;
