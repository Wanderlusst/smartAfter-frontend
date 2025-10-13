'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  Store, 
  FileText,
  Loader2,
  ShoppingBag,
  RefreshCw,
  TrendingUp,
  CreditCard,
  Package,
  Eye,
  Download,
  Share2,
  List,
  Grid3X3,
  Zap,
  BarChart3,
  PieChart
} from 'lucide-react';
import { useDataStore } from '../stores/dataStore';
import { useNonBlockingNavigation } from '../lib/navigation';
import TimeFilter, { TimeFilter as TimeFilterType } from '../components/dashboard/TimeFilter';

export default function PurchasesClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState('list');
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>({
    id: '3m',
    label: '3 Months',
    days: 90,
    description: 'Quarterly',
    icon: Calendar,
    color: 'text-blue-600'
  });
  
  const { navigate } = useNonBlockingNavigation();
  
  // Use centralized data store
  const {
    purchases,
    totalSpent,
    isLoading,
    error,
    refreshData,
    fetchPurchases
  } = useDataStore();

  // Filter and sort purchases
  const filteredPurchases = useMemo(() => {
    let filtered = [...purchases];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(purchase => 
        purchase.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.store?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.subject?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by store
    if (selectedStore !== 'all') {
      filtered = filtered.filter(purchase => 
        purchase.vendor === selectedStore || purchase.store === selectedStore
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'amount':
          aValue = typeof a.amount === 'string' ? parseFloat(a.amount.replace(/[₹,\s]/g, '') || '0') : (a.amount || 0);
          bValue = typeof b.amount === 'string' ? parseFloat(b.amount.replace(/[₹,\s]/g, '') || '0') : (b.amount || 0);
          break;
        case 'vendor':
          aValue = a.vendor || '';
          bValue = b.vendor || '';
          break;
        default:
          aValue = new Date(a.date || 0).getTime();
          bValue = new Date(b.date || 0).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [purchases, searchQuery, selectedStore, sortBy, sortOrder]);

  // Get unique stores for filter
  const uniqueStores = useMemo(() => {
    const stores = new Set<string>();
    purchases.forEach(purchase => {
      if (purchase.vendor) stores.add(purchase.vendor);
      if (purchase.store && purchase.store !== purchase.vendor) stores.add(purchase.store);
    });
    return Array.from(stores).sort();
  }, [purchases]);

  const handleRefresh = async () => {
    await refreshData();
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' 
      ? parseFloat(amount.replace(/[₹,\s]/g, '') || '0')
      : amount;
    
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalAmount = purchases.reduce((sum, purchase) => {
      const amount = typeof purchase.amount === 'string' 
        ? parseFloat(purchase.amount.replace(/[₹,\s]/g, '') || '0')
        : (purchase.amount || 0);
      return sum + amount;
    }, 0);

    const uniqueVendors = new Set(purchases.map(p => p.vendor)).size;
    const thisMonth = purchases.filter(p => {
      const purchaseDate = new Date(p.date || '');
      const now = new Date();
      return purchaseDate.getMonth() === now.getMonth() && 
             purchaseDate.getFullYear() === now.getFullYear();
    }).length;

    return {
      totalAmount,
      totalPurchases: purchases.length,
      uniqueVendors,
      thisMonth
    };
  }, [purchases]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                <ShoppingBag className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Error Loading Purchases
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
              <Button onClick={handleRefresh} className="bg-blue-500 hover:bg-blue-600">
                Try Again
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-8 mb-12"
        >
          <div className="flex items-center justify-center gap-4">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-lg">
              <ShoppingBag className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Purchase Tracker
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">
                Smart purchase management
              </p>
            </div>
          </div>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
            Track and manage all your purchases with intelligent categorization and spending insights. 
            Never lose track of your expenses again.
          </p>
        </motion.div>

        {isLoading ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Loading Purchases
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Scanning your emails for purchase information...
            </p>
          </motion.div>
        ) : (
          <>
            {/* Enhanced Statistics Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <DollarSign className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(stats.totalAmount)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Spent</p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                    <Package className="w-7 h-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {stats.totalPurchases}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Purchases</p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                    <Store className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {stats.uniqueVendors}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Unique Vendors</p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                    <TrendingUp className="w-7 h-7 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {stats.thisMonth}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">This Month</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Controls */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-8 shadow-sm"
            >
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                  {/* Search */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search purchases..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                    />
                  </div>

                  {/* Store Filter */}
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Stores</option>
                    {uniqueStores.map(store => (
                      <option key={store} value={store}>{store}</option>
                    ))}
                  </select>

                  {/* Sort */}
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('-');
                      setSortBy(field);
                      setSortOrder(order as 'asc' | 'desc');
                    }}
                    className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="date-desc">Date (Newest)</option>
                    <option value="date-asc">Date (Oldest)</option>
                    <option value="amount-desc">Amount (High to Low)</option>
                    <option value="amount-asc">Amount (Low to High)</option>
                    <option value="vendor-asc">Vendor (A-Z)</option>
                    <option value="vendor-desc">Vendor (Z-A)</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <TimeFilter
                    currentFilter={timeFilter}
                    onFilterChange={setTimeFilter}
                    compact={true}
                  />
                  
                  <Button 
                    onClick={handleRefresh} 
                    disabled={isLoading}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-2.5"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Refresh
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
              <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <List className="w-4 h-4" />
                  List View
                </TabsTrigger>
                <TabsTrigger value="grid" className="flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4" />
                  Grid View
                </TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="mt-6">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <AnimatePresence>
                    {filteredPurchases.map((purchase, index) => (
                      <motion.div
                        key={purchase.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ scale: 1.01, y: -2 }}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                              <ShoppingBag className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {purchase.vendor || purchase.store || 'Unknown Vendor'}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {purchase.subject || 'Purchase'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500">
                                {formatDate(purchase.date || '')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {formatCurrency(purchase.amount || 0)}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                Purchase
                              </Badge>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </TabsContent>

              <TabsContent value="grid" className="mt-6">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  <AnimatePresence>
                    {filteredPurchases.map((purchase, index) => (
                      <motion.div
                        key={purchase.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ scale: 1.02, y: -4 }}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
                      >
                        <div className="text-center space-y-4">
                          <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-xl w-fit mx-auto">
                            <ShoppingBag className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                              {purchase.vendor || purchase.store || 'Unknown Vendor'}
                            </h3>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                              {formatCurrency(purchase.amount || 0)}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                              {formatDate(purchase.date || '')}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              Purchase
                            </Badge>
                          </div>
                          <div className="flex justify-center gap-2 pt-4">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Share2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </TabsContent>
            </Tabs>

            {filteredPurchases.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20"
              >
                <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                  <ShoppingBag className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No Purchases Found
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {searchQuery || selectedStore !== 'all' 
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Your purchases will appear here once they are processed.'
                  }
                </p>
                <Button onClick={handleRefresh} className="bg-blue-500 hover:bg-blue-600">
                  Refresh Data
                </Button>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}