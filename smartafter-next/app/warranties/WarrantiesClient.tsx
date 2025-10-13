'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { 
  Shield, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  DollarSign,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Download,
  Share2,
  Loader2,
  Box,
  List,
  TrendingUp,
  Zap
} from 'lucide-react';
import WarrantyModel from '../components/3d/WarrantyModel';

interface Warranty {
  id: string;
  item: string;
  merchant: string;
  amount: number | string;
  coverage?: string | number; // Add coverage property for API data
  purchaseDate: string;
  expiry: string;
  status: 'active' | 'expiring_soon' | 'expired';
  daysUntilExpiry: number;
  warrantyPeriod: number;
  category: string;
  originalPurchase: any;
}

interface WarrantiesClientProps {
  initialWarranties: Warranty[];
  error: string | null;
}

const formatCurrency = (amount: number | string) => {
  // Handle string amounts from API
  let numericAmount = 0;
  
  if (typeof amount === 'string') {
    // Remove currency symbols and convert to number
    const cleanAmount = amount.replace(/[^\d.-]/g, '');
    numericAmount = parseFloat(cleanAmount) || 0;
  } else if (typeof amount === 'number') {
    numericAmount = amount;
  }
  
  // Return formatted currency or ₹0 if invalid
  if (isNaN(numericAmount) || numericAmount === 0) {
    return '₹0';
  }
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(numericAmount);
};

const formatDate = (dateString: string) => {
  if (!dateString || dateString === 'Invalid Date') {
    return 'N/A';
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return 'N/A';
  }
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric'
  });
};

const WarrantiesClient: React.FC<WarrantiesClientProps> = ({ initialWarranties, error }) => {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('list');

  // Fetch warranties data
  const fetchWarranties = async () => {
    try {
      setIsLoading(true);
      // console.log removed
      
      // Use main warranties endpoint for instant loading with cache busting
      const response = await fetch(`/api/warranties?t=${Date.now()}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Process warranty data safely to prevent NaN values
        const processedWarranties = (data.warranties || []).map((warranty: any) => {
          // Handle amount/coverage
          let amount = warranty.amount || warranty.coverage || 0;
          if (typeof amount === 'string') {
            const cleanAmount = amount.replace(/[^\d.-]/g, '');
            amount = parseFloat(cleanAmount) || 0;
          }
          
          // Handle dates safely
          let expiryDate = warranty.expiry || warranty.expiryDate || new Date().toISOString();
          let daysUntilExpiry = warranty.daysLeft || warranty.daysUntilExpiry || 0;
          
          // Calculate days until expiry if not provided
          if (daysUntilExpiry === 0) {
            try {
              const expiry = new Date(expiryDate);
              const now = new Date();
              daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            } catch (error) {
              daysUntilExpiry = 365; // Default to 1 year if date parsing fails
            }
          }
          
          // Determine status based on days
          let status = warranty.status || 'active';
          if (daysUntilExpiry < 0) {
            status = 'expired';
          } else if (daysUntilExpiry <= 30) {
            status = 'expiring_soon';
          }
          
          return {
            id: warranty.id || `warranty-${Math.random()}`,
            item: warranty.item || warranty.title || 'Unknown Item',
            merchant: warranty.vendor || warranty.merchant || 'Unknown Vendor',
            amount: amount,
            coverage: warranty.coverage || amount,
            purchaseDate: warranty.purchaseDate || new Date().toISOString(),
            expiry: expiryDate,
            status: status,
            daysUntilExpiry: daysUntilExpiry,
            warrantyPeriod: warranty.warrantyPeriod || 365,
            category: warranty.category || 'Electronics',
            originalPurchase: warranty
          };
        });
        
        setWarranties(processedWarranties);
        
      } else {
        
      }
    } catch (error) {
      
    } finally {
      setIsLoading(false);
    }
  };

  // Force refresh function
  const forceRefresh = async () => {
    try {
      // console.log removed
      setIsLoading(true);
      
      const response = await fetch(`/api/warranties?refresh=true&t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        // console.log removed
        setWarranties(data.warranties || []);
      }
    } catch (error) {
      
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchWarranties();
  }, []);

  // Filter and sort warranties
  const filteredWarranties = React.useMemo(() => {
    let filtered = (warranties || []).filter(warranty => warranty && typeof warranty === 'object');
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(warranty => 
        (warranty.item || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (warranty.merchant || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(warranty => 
        (warranty.category || '').toLowerCase() === filterCategory.toLowerCase()
      );
    }
    
    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(warranty => warranty.status === filterStatus);
    }
    
    // Sort by expiry date (closest first)
    return filtered.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  }, [warranties, searchTerm, filterCategory, filterStatus]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const warrantiesArray = (warranties || []).filter(w => w && typeof w === 'object');
    const activeWarranties = warrantiesArray.filter(w => w.status === 'active').length;
    const expiringSoon = warrantiesArray.filter(w => w.status === 'expiring_soon').length;
    const expired = warrantiesArray.filter(w => w.status === 'expired').length;
    
    // Safe totalValue calculation to prevent NaN
    const totalValue = warrantiesArray.reduce((sum, w) => {
      let amount = w.amount || w.coverage || 0;
      
      // Convert string amounts to numbers safely
      if (typeof amount === 'string') {
        const cleanAmount = amount.replace(/[^\d.-]/g, '');
        amount = parseFloat(cleanAmount) || 0;
      } else if (typeof amount === 'number') {
        amount = amount;
      } else {
        amount = 0;
      }
      
      return sum + amount;
    }, 0);
    
    return { activeWarranties, expiringSoon, expired, totalValue };
  }, [warranties]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Shield className="w-4 h-4 text-green-500" />;
      case 'expiring_soon': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'expired': return <Clock className="w-4 h-4 text-red-500" />;
      default: return <Shield className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'expiring_soon': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'expired': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 mb-4">Failed to load warranties</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
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
              <Shield className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Warranty Manager
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">
                Smart warranty tracking
              </p>
            </div>
          </div>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
            Track and manage your product warranties with intelligent monitoring and alerts. 
            Never miss an expiry date again.
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
              Loading Warranties
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Scanning your emails for warranty information...
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
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                    <Shield className="w-7 h-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {stats.activeWarranties}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Active Warranties</p>
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
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                    <AlertTriangle className="w-7 h-7 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {stats.expiringSoon}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Expiring Soon</p>
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
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                    <Clock className="w-7 h-7 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {stats.expired}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Expired</p>
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
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                    <DollarSign className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(stats.totalValue)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Value</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Enhanced View Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <div className="flex justify-center">
                  <TabsList className="grid w-full max-w-md grid-cols-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg">
                    <TabsTrigger 
                      value="list" 
                      className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg transition-all duration-200"
                    >
                      <List className="w-4 h-4" />
                      List View
                    </TabsTrigger>
                    <TabsTrigger 
                      value="3d" 
                      className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg transition-all duration-200"
                    >
                      <Box className="w-4 h-4" />
                      3D Analysis
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* List View Tab */}
                <TabsContent value="list" className="space-y-6">
                  {/* Enhanced Filters and Search */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm"
                  >
                    <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="relative flex-1 max-w-lg">
                          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                          <Input
                            type="text"
                            placeholder="Search warranties, products, or merchants..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 h-12 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          />
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Category:</label>
                          <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="px-4 py-2 h-12 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          >
                            <option value="all">All Categories</option>
                            <option value="mobile">Mobile</option>
                            <option value="computer">Computer</option>
                            <option value="audio">Audio</option>
                            <option value="wearable">Wearable</option>
                            <option value="tablet">Tablet</option>
                            <option value="tv">TV</option>
                            <option value="camera">Camera</option>
                            <option value="electronics">Electronics</option>
                            <option value="gadgets">Gadgets</option>
                          </select>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Status:</label>
                          <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-4 py-2 h-12 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="expiring_soon">Expiring Soon</option>
                            <option value="expired">Expired</option>
                          </select>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={forceRefresh}
                        className="h-12 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                      </Button>
                    </div>
                  </motion.div>

                  {/* Enhanced Warranties List */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Warranties ({filteredWarranties.length})
                      </h2>
                    </div>
                    
                    {filteredWarranties.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-20"
                      >
                        <div className="w-32 h-32 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
                          <Shield className="w-16 h-16 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                          No Warranties Found
                        </h3>
                        <p className="text-lg text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
                          {searchTerm ? 'Try adjusting your search terms to find more warranties.' : 'Scanning your emails for warranty information...'}
                        </p>
                        {searchTerm && (
                          <Button
                            variant="outline"
                            onClick={() => setSearchTerm('')}
                            className="px-8 py-3 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-xl"
                          >
                            Clear Search
                          </Button>
                        )}
                      </motion.div>
                    ) : (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                              <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                  Product
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                  Merchant
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                  Coverage
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                  Expiry
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                  Status
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white/50 dark:bg-gray-800/50 divide-y divide-gray-200 dark:divide-gray-700">
                              {filteredWarranties.map((warranty, index) => (
                                <motion.tr 
                                  key={warranty.id} 
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 group"
                                >
                                  <td className="px-6 py-6 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div className="flex-shrink-0 h-12 w-12">
                                        <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                                          <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                        </div>
                                      </div>
                                      <div className="ml-4">
                                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                          {warranty.item}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                          {warranty.category}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-6 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {warranty.merchant}
                                  </td>
                                  <td className="px-6 py-6 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {formatCurrency(warranty.amount)}
                                  </td>
                                  <td className="px-6 py-6 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {formatDate(warranty.expiry)}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                      {warranty.daysUntilExpiry > 0 ? `${warranty.daysUntilExpiry} days left` : 'Expired'}
                                    </div>
                                  </td>
                                  <td className="px-6 py-6 whitespace-nowrap">
                                    <Badge className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(warranty.status)}`}>
                                      <div className="flex items-center gap-2">
                                        {getStatusIcon(warranty.status)}
                                        {warranty.status.replace('_', ' ')}
                                      </div>
                                    </Badge>
                                  </td>
                                  <td className="px-6 py-6 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center gap-2">
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="h-8 w-8 p-0 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 hover:scale-105"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="h-8 w-8 p-0 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 hover:scale-105"
                                      >
                                        <Download className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </motion.tr>
                              ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                    )}
                  </motion.div>
                </TabsContent>

                {/* Enhanced 3D Analysis Tab */}
                <TabsContent value="3d" className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-xl overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-8">
                        <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Box className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          3D Warranty Analysis
                        </CardTitle>
                        <p className="text-gray-600 dark:text-gray-300 mt-2">
                          Interactive 3D visualization of your warranties. Click on items to see details.
                        </p>
                      </CardHeader>
                      <CardContent className="p-8">
                        <WarrantyModel 
                          warranties={(warranties || []).map(w => ({
                            id: w.id,
                            product: w.item,
                            expiryDate: w.expiry,
                            status: w.status,
                            daysLeft: w.daysUntilExpiry
                          }))}
                          onItemClick={(item) => {
                            // You can add modal or navigation here
                          }}
                        />
                      </CardContent>
                    </Card>
                  </motion.div>
                </TabsContent>
              </Tabs>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default WarrantiesClient; 