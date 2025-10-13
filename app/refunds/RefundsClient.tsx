'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  DollarSign,
  RefreshCw,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useRefunds } from '@/app/hooks/useOptimizedData';

interface Refund {
  id: string;
  amount: number | string;
  status: 'eligible' | 'urgent' | 'pending' | 'completed';
  vendor: string;
  product: string;
  date: string;
  daysUntilDeadline: number;
  reason: string;
  category: string;
}

interface RefundsClientProps {
  refunds?: Refund[];
  totalRefundable?: number;
  totalRefunded?: number;
  count?: number;
  urgentCount?: number;
  eligibleCount?: number;
}

export default function RefundsClient({ 
  refunds: initialRefunds = [], 
  totalRefundable: initialTotalRefundable = 0, 
  totalRefunded: initialTotalRefunded = 0, 
  count: initialCount = 0,
  urgentCount: initialUrgentCount = 0,
  eligibleCount: initialEligibleCount = 0
}: RefundsClientProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Use the useRefunds hook for proper data structure
  const { refundOpportunities: refunds, totalPotentialAmount, isLoading, error } = useRefunds();
  
  // Calculate totalRefundable safely
  const totalRefundable = totalPotentialAmount || 0;
  
  // Calculate additional stats from refunds data
  const count = refunds.length;
  const eligibleCount = refunds.filter((r: any) => r.status === 'eligible').length;
  const urgentCount = refunds.filter((r: any) => r.status === 'urgent').length;
  const totalRefunded = 0; // Mock value for now

  // Filter and sort refunds
  const filteredRefunds = useMemo(() => {
    let filtered = refunds || [];
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter((r: any) => r.status === filterStatus);
    }
    
    return filtered.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'amount':
          const amountA = typeof a.amount === 'string' ? parseFloat(a.amount.replace(/[^\d.-]/g, '')) : a.amount;
          const amountB = typeof b.amount === 'string' ? parseFloat(b.amount.replace(/[^\d.-]/g, '')) : b.amount;
          return (amountB || 0) - (amountA || 0);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'date':
        default:
          return new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime();
      }
    });
  }, [refunds, sortBy, filterStatus]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'urgent': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'eligible': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'completed': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      'urgent': <AlertTriangle className="w-4 h-4" />,
      'eligible': <CheckCircle className="w-4 h-4" />,
      'pending': <Clock className="w-4 h-4" />,
      'completed': <CheckCircle className="w-4 h-4" />,
    };
    return icons[status] || <Clock className="w-4 h-4" />;
  };

  const handleRefundClick = (refund: any) => {
  };

  // Helper function to safely format amounts
  const formatAmount = (amount: any): string => {
    if (typeof amount === 'number') {
      return `₹${amount.toFixed(2)}`;
    }
    if (typeof amount === 'string') {
      // Remove currency symbols and convert to number
      const numericAmount = parseFloat(amount.replace(/[^\d.-]/g, ''));
      if (!isNaN(numericAmount)) {
        return `₹${numericAmount.toFixed(2)}`;
      }
      // If it's already formatted as currency, return as is
      if (amount.includes('₹')) {
        return amount;
      }
      return `₹${amount}`;
    }
    return '₹0.00';
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Refund Opportunities</h1>
          <p className="text-gray-600 dark:text-gray-400">Track and manage your refund opportunities</p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-enhanced">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Eligible Refunds</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{eligibleCount}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-enhanced">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Urgent Actions</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{urgentCount}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass-enhanced">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{totalRefundable.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass-enhanced">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Urgent Value</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ₹{(filteredRefunds.filter((r: any) => r.status === 'urgent').reduce((sum: number, r: any) => sum + (typeof r.amount === 'string' ? parseFloat(r.amount.replace(/[^\d.-]/g, '')) : r.amount || 0), 0) || 0).toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="glass-enhanced">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Recent Refunds */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Refunds</h2>
            </div>

            <div className="grid gap-4">
                              {filteredRefunds.slice(0, 6).map((refund: any, index: number) => (
                <motion.div
                  key={refund.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="glass-enhanced hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {refund.product_name || refund.product || 'Unknown Product'}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{refund.vendor || refund.store || 'Unknown Vendor'}</p>
                        </div>
                        <Badge className={getStatusColor(refund.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(refund.status)}
                            {refund.status}
                          </div>
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatAmount(refund.amount)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {refund.date || refund.created_at}
                          </span>
                          {refund.days_until_deadline && refund.days_until_deadline <= 3 && (
                            <Badge variant="destructive" className="text-xs">
                              {refund.days_until_deadline} days left
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {refund.reason || refund.description || 'No description available'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* List View Tab */}
        <TabsContent value="list" className="space-y-4">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">All Refunds</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Complete list of your refund opportunities with filtering and sorting options.
            </p>
            
            <div className="grid gap-4">
                              {filteredRefunds.map((refund: any, index: number) => (
                <motion.div
                  key={refund.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="glass-enhanced hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {refund.product}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{refund.vendor}</p>
                        </div>
                        <Badge className={getStatusColor(refund.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(refund.status)}
                            {refund.status}
                          </div>
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatAmount(refund.amount)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {refund.date}
                          </span>
                          {refund.daysUntilDeadline <= 3 && (
                            <Badge variant="destructive" className="text-xs">
                              {refund.daysUntilDeadline} days left
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {refund.reason}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 