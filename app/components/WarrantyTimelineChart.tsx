import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

const warrantyData = [
  { 
    product: 'iPhone 14 Pro', 
    brand: 'Apple', 
    expiryDate: '2024-07-15', 
    daysLeft: 10, 
    status: 'critical',
    value: '₹89,900'
  },
  { 
    product: 'MacBook Pro M2', 
    brand: 'Apple', 
    expiryDate: '2024-11-22', 
    daysLeft: 140, 
    status: 'warning',
    value: '₹1,89,900'
  },
  { 
    product: 'Sony WH-1000XM5', 
    brand: 'Sony', 
    expiryDate: '2025-03-08', 
    daysLeft: 245, 
    status: 'safe',
    value: '₹29,990'
  },
  { 
    product: 'Samsung 4K TV', 
    brand: 'Samsung', 
    expiryDate: '2025-08-12', 
    daysLeft: 402, 
    status: 'safe',
    value: '₹75,000'
  },
];

const WarrantyTimelineChart = () => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'critical':
        return {
          color: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          icon: <AlertTriangle className="w-4 h-4" />
        };
      case 'warning':
        return {
          color: 'text-amber-600 dark:text-amber-400',
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          border: 'border-amber-200 dark:border-amber-800',
          icon: <Clock className="w-4 h-4" />
        };
      default:
        return {
          color: 'text-emerald-600 dark:text-emerald-400',
          bg: 'bg-emerald-50 dark:bg-emerald-900/20',
          border: 'border-emerald-200 dark:border-emerald-800',
          icon: <CheckCircle className="w-4 h-4" />
        };
    }
  };

  return (
    <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Warranty Timeline
            </CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Track warranty expiration dates
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">23</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Active warranties</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-6">
        <div className="space-y-4">
          {warrantyData.map((item, index) => {
            const statusConfig = getStatusConfig(item.status);
            return (
              <div 
                key={index}
                className={`p-4 rounded-xl border ${statusConfig.bg} ${statusConfig.border} transition-all duration-200 hover:shadow-md`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${statusConfig.bg} ${statusConfig.color}`}>
                      {statusConfig.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                        {item.product}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {item.brand} • {item.value}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold text-sm ${statusConfig.color}`}>
                      {item.daysLeft} days left
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Expires {mounted ? new Date(item.expiryDate).toLocaleDateString() : ''}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default WarrantyTimelineChart;
