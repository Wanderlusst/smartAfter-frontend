'use client';

import { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react';

interface DataSyncDropdownProps {
  progress: number;
  dataQuality: number;
  onRefresh: () => void;
  isLoading: boolean;
  error: string | null;
}

export function DataSyncDropdown({
  progress,
  dataQuality,
  onRefresh,
  isLoading,
  error
}: DataSyncDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Ensure dataQuality is a valid number
  const safeDataQuality = typeof dataQuality === 'number' && !isNaN(dataQuality) ? dataQuality : 0;

  const getQualityColor = (quality: number) => {
    if (quality >= 80) return 'bg-emerald-500';
    if (quality >= 60) return 'bg-blue-500';
    if (quality >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getQualityIcon = (quality: number) => {
    if (quality >= 80) return <CheckCircle className="w-3 h-3" />;
    if (quality >= 60) return <CheckCircle className="w-3 h-3" />;
    if (quality >= 40) return <CheckCircle className="w-3 h-3" />;
    return <AlertCircle className="w-3 h-3" />;
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90"
        >
          <div className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="text-sm">Data Sync</span>
            <div className={`w-2 h-2 rounded-full ${getQualityColor(safeDataQuality)}`}></div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span>Data Quality</span>
            {getQualityIcon(safeDataQuality)}
          </div>
          <Badge variant="outline" className="ml-auto">
            {safeDataQuality}%
          </Badge>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <div className="p-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Current data coverage and quality
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Data Quality</span>
              <span className="font-medium">{safeDataQuality}%</span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getQualityColor(safeDataQuality)}`}
                style={{ width: `${safeDataQuality}%` }}
              />
            </div>
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Data
        </DropdownMenuItem>
        
        {error && (
          <div className="p-2 text-xs text-red-600 dark:text-red-400">
            Error: {error}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
