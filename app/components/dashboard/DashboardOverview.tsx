"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { 
  TrendingUp, 
  ShoppingCart, 
  Shield, 
  FileText, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useDataStore } from '../../stores/dataStore';
import { GmailConnectionPrompt } from '../GmailConnectionPrompt';

// Helper function to get PROPER last 7 days date for Gmail search
function getLastWeekDate(): string {
  // FORCE 2024 DATE - server time is wrong showing 2025
  const today = new Date();
  
  // Check if server time is wrong (showing future year)
  if (today.getFullYear() > 2024) {
    
    today.setFullYear(2024);
  }
  
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);
  
  // Ensure we don't go into the future
  if (lastWeek > today) {
    
    lastWeek.setDate(today.getDate() - 30);
  }
  
  const year = lastWeek.getFullYear();
  const month = String(lastWeek.getMonth() + 1).padStart(2, '0');
  const day = String(lastWeek.getDate()).padStart(2, '0');
  
  const dateFilter = `${year}/${month}/${day}`;
  
  return dateFilter;
}

interface DashboardOverviewProps {
  data?: {
    totalSpent: number;
    purchaseCount: number;
    activeWarranties: number;
    documents: { total: number };
    refundable: { amount: number };
    source?: string;
    isLoading?: boolean;
    error?: any;
    syncStatus?: {
      isEmailSyncing: boolean;
      progress: number;
      canSync: boolean;
    };
  };
  initialData?: {
    totalSpent: number;
    purchaseCount: number;
    activeWarranties: number;
    documents: { total: number };
    refundable: { amount: number };
    source?: string;
  };
  onRefresh?: () => void;
  onManualSync?: () => void;
  onForceRefresh?: () => void;

}

const DashboardOverview = ({ 
  data, 
  initialData, 
  onRefresh, 
  onManualSync,

}: DashboardOverviewProps) => {
  
  // Debug: Log what data we're receiving
  // console.log removed
  
  // Use centralized data store instead of SWR hooks
  const { 
    totalSpent, 
    purchases, 
    warranties, 
    documents, 
    refundOpportunities,
    isLoading: storeIsLoading,
    hasInitialData
  } = useDataStore();

  // Format currency with proper Indian formatting
  const formatCurrency = (amount: number) => {
    if (amount === 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Use real data only - no hardcoded fallbacks
  // Prioritize initialData (SSR data) over data store
  const currentTotalSpent = initialData?.totalSpent || data?.totalSpent || totalSpent || 0;
  const currentPurchaseCount = initialData?.purchaseCount || data?.purchaseCount || purchases.length || 0;
  const currentWarranties = initialData?.activeWarranties || data?.activeWarranties || warranties.filter(w => w.status === 'active').length || 0;
  const currentDocuments = initialData?.documents?.total || data?.documents?.total || documents.length || 0;
  const currentRefundable = initialData?.refundable?.amount || data?.refundable?.amount || refundOpportunities.length || 0;
  
  // Debug: Log the final calculated values

  // Show loading state only when actually loading and no data is available
  const isLoading = storeIsLoading && !hasInitialData && purchases.length === 0;
  
  // Show real-time update notification when data changes
  const [showUpdateNotification, setShowUpdateNotification] = React.useState(false);
  
  React.useEffect(() => {
    if (purchases.length > 0 && currentTotalSpent > 0) {
      setShowUpdateNotification(true);
      const timer = setTimeout(() => setShowUpdateNotification(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [purchases.length, currentTotalSpent]);
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Real-time update notification */}
        {showUpdateNotification && (
          <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-in slide-in-from-right">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Dashboard updated with fresh data!</span>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600 dark:text-blue-400" />
            <p className="text-gray-600 dark:text-gray-300">Loading dashboard data...</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {purchases.length > 0 ? `${purchases.length} purchases found` : 'Fetching from Gmail...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show login prompt if user needs to log in first
  if (data?.source === 'login-required' || initialData?.source === 'login-required') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Login Required
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You need to log in first to access your Gmail data and view your invoices.
              </p>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={() => window.location.href = '/landing'}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Go to Login Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show Gmail connection prompt if authentication is required
  if (data?.source === 'gmail-auth-required' || initialData?.source === 'gmail-auth-required') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <GmailConnectionPrompt 
            onConnectionSuccess={() => {
              // Refresh the page to reload data
              window.location.reload();
            }}
          />
        </div>
      </div>
    );
  }

  // Log if we're about to render empty state
  if (currentPurchaseCount === 0) {
    // console.log removed
  } else {
    // console.log removed
  }

  // Calculate data quality score
  const getDataQualityScore = () => {
    if (currentPurchaseCount === 0) return 0;
    const baseScore = Math.min(currentPurchaseCount / 10, 1) * 100;
    return Math.round(baseScore);
  };

  const calculatedDataQuality = getDataQualityScore();

  // Get quality color and icon
  const getQualityDisplay = (quality: number) => {
    if (quality >= 80) return { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle, label: 'Excellent' };
    if (quality >= 60) return { color: 'text-blue-600', bg: 'bg-blue-50', icon: TrendingUp, label: 'Good' };
    if (quality >= 40) return { color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock, label: 'Fair' };
    return { color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle, label: 'Poor' };
  };

  const qualityDisplay = getQualityDisplay(85); // Default quality

  return (
    <div className="space-y-6">
      {/* Real-time update notification */}
      {showUpdateNotification && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-in slide-in-from-right">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>Dashboard updated with fresh data!</span>
          </div>
        </div>
      )}
      
      {/* Data Source Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {data?.source || initialData?.source || 'data-store'}
          </Badge>
          {/* Background sync indicator */}
          {purchases.length === 0 && (
            <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Syncing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Financial Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Your spending insights powered by Gmail data
          </p>
        </div>
        
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Spent Card */}
        <div className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-200">Total Spent</CardTitle>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(currentTotalSpent)}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              {currentPurchaseCount} purchases tracked
            </p>
          </CardContent>
        </div>

        {/* Purchase Count Card */}
        <div className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
          <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-200">Purchases</CardTitle>
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800/40 transition-colors">
                  <ShoppingCart className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {currentPurchaseCount}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                transactions this period
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Documents Card */}
        <div className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
          <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-200">Documents</CardTitle>
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-800/40 transition-colors">
                  <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {currentDocuments}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                invoices & receipts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Data Quality Card */}
        <div className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
          <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-200">Data Quality</CardTitle>
                <div className={`p-2 rounded-lg transition-colors ${qualityDisplay.bg} group-hover:opacity-80`}>
                  <qualityDisplay.icon className={`w-5 h-5 ${qualityDisplay.color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {calculatedDataQuality}%
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                {qualityDisplay.label} coverage
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Warranties Card */}
        <div className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
          <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-200">Active Warranties</CardTitle>
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/40 transition-colors">
                  <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {currentWarranties}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                protection plans active
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Refund Opportunities Card */}
        <div className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
          <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-200">Refund Opportunities</CardTitle>
                <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg group-hover:bg-rose-200 dark:group-hover:bg-rose-800/40 transition-colors">
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {currentRefundable}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                potential savings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Data Source Card */}
        <div className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
          <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-200">Data Source</CardTitle>
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
                  <CheckCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                {data?.source || initialData ? 'Gmail' : 'None'}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                {data?.source || initialData ? 'Connected & syncing' : 'Not connected'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>


      {/* Empty State */}
      {currentPurchaseCount === 0 && (
        <div className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
          <Card className="border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
            <CardContent className="pt-12 pb-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No Purchase Data Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
                Connect your Gmail account to start tracking your purchases and get insights into your spending patterns.
              </p>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Connect Gmail
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DashboardOverview; 