"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { 
  DollarSign, 
  ShoppingBag, 
  RefreshCw, 
  Shield, 
  FileText, 
  TrendingUp,
  Calendar,
  ChevronDown
} from 'lucide-react';
import { useDataStore } from '../../stores/dataStore';
import ClientOnly from '../ClientOnly';
import { ReauthBanner } from '../ReauthBanner';
import { DataSyncDropdown } from '../dashboard/DataSyncDropdown';
import SyncFilterModal, { SyncFilter } from '../dashboard/SyncFilterModal';
// ReactBits components
import { 
  AnimatedCard, 
  AnimatedButton, 
  FadeInText, 
  SplitText, 
  LoadingSpinner,
  GradientText 
} from '../reactbits';

interface DashboardLayoutProps {
  children: React.ReactNode;
  showSummaryCards?: boolean;
  title?: string;
  subtitle?: string;
}

export default function DashboardLayout({ 
  children, 
  showSummaryCards = false,
  title = "Dashboard",
  subtitle = "Financial Dashboard"
}: DashboardLayoutProps) {
  const { 
    purchases, 
    totalSpent, 
    refundOpportunities, 
    warranties, 
    documents,
    isLoading,
    refreshData,
    syncEmailData,
    fetchDocuments,
    isEmailSyncing 
  } = useDataStore();

  // Data quality state
  const [dataQuality] = React.useState(85);

  // Modal state
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<SyncFilter>({
    id: '3m',
    label: '3 Months',
    days: 90,
    description: 'Quarterly analysis & insights',
    icon: Calendar,
    color: 'text-blue-600'
  });

  // Force fresh data loading - only once on mount
  useEffect(() => {
    const hasLoaded = sessionStorage.getItem('dashboard-data-loaded');
    
    if (!hasLoaded) {
      
      // Refresh data from the centralized store
      refreshData();
      
      // Mark as loaded to prevent re-running
      sessionStorage.setItem('dashboard-data-loaded', 'true');
      
    } else {
    }

  }, []); // Empty dependency array - only run on mount

  // Handle data refresh (background sync disabled)
  const handleDataSync = async () => {
    // Prevent multiple syncs from running simultaneously
    if (isAnySyncInProgress) {
      return;
    }

    try {
      
      // Refresh data (background sync disabled)
      await refreshData();
      
      // Specifically refresh documents to update the count
      await fetchDocuments();
      
    } catch (error) {
      
    }
  };

  // Handle filter change
  const handleFilterChange = (filter: SyncFilter) => {
    setCurrentFilter(filter);
  };

  // Show loading state when any sync is in progress
  const isAnySyncInProgress = isLoading || isEmailSyncing;

  // Calculate summary stats
  const calculateStats = () => {
    // Ensure we have valid arrays before processing
    const safeRefundOpportunities = Array.isArray(refundOpportunities) ? refundOpportunities : [];
    const safeWarranties = Array.isArray(warranties) ? warranties : [];
    const safeDocuments = Array.isArray(documents) ? documents : [];

    const totalRefunds = safeRefundOpportunities.reduce((sum: number, refund: any) => {
      let amount = 0;
      
      if (refund.amount) {
        if (typeof refund.amount === 'string') {
          // Handle string amounts with currency symbols
          amount = parseFloat(refund.amount.replace(/[₹,\s]/g, '') || '0') || 0;
        } else if (typeof refund.amount === 'number') {
          // Handle numeric amounts directly
          amount = refund.amount;
        }
      }
      
      return sum + amount;
    }, 0);

    const urgentRefunds = safeRefundOpportunities.filter((r: any) => r.status === 'urgent').length;
    const activeWarranties = safeWarranties.filter((w: any) => w.status === 'active').length;
    const expiringWarranties = safeWarranties.filter((w: any) => w.daysLeft <= 30).length;
    const totalDocuments = safeDocuments.length;

    // Calculate monthly growth (simplified for now)
    const growthPercentage = 0; // We can add this back when we have monthly data

    return {
      totalRefunds,
      urgentRefunds,
      activeWarranties,
      expiringWarranties,
      totalDocuments,
      growthPercentage
    };
  };

  const stats = calculateStats();

  // Server-side fallback content that matches the client-side loading state
  const SummaryCardsFallback = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 animate-pulse">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </CardHeader>
          <CardContent>
            <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Client-side summary cards content
  const SummaryCardsContent = () => {
    if (isLoading) {
      return <SummaryCardsFallback />;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatedCard 
          variant="glass" 
          animation="slideUp" 
          delay={0.1}
          hover="lift"
          className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <GradientText 
              text={`₹${totalSpent.toLocaleString('en-IN')}`}
              className="text-2xl font-bold"
              gradient="from-indigo-500 to-purple-500"
            />
            <div className="flex items-center text-xs text-muted-foreground">
              {stats.growthPercentage >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
              ) : (
                <TrendingUp className="w-3 h-3 text-red-500 mr-1 rotate-180" />
              )}
              {Math.abs(stats.growthPercentage).toFixed(1)}% from last month
            </div>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard 
          variant="glass" 
          animation="slideUp" 
          delay={0.2}
          hover="lift"
          className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Refund Opportunities</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <GradientText 
              text={`₹${typeof stats.totalRefunds === 'number' ? stats.totalRefunds.toLocaleString('en-IN') : '0'}`}
              className="text-2xl font-bold"
              gradient="from-emerald-500 to-green-500"
            />
            <p className="text-xs text-muted-foreground">{stats.urgentRefunds} urgent actions needed</p>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard 
          variant="glass" 
          animation="slideUp" 
          delay={0.3}
          hover="lift"
          className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Warranties</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <GradientText 
              text={stats.activeWarranties.toString()}
              className="text-2xl font-bold"
              gradient="from-purple-500 to-pink-500"
            />
            <p className="text-xs text-muted-foreground">{stats.expiringWarranties} expiring soon</p>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard 
          variant="glass" 
          animation="slideUp" 
          delay={0.4}
          hover="lift"
          className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <GradientText 
              text={stats.totalDocuments.toString()}
              className="text-2xl font-bold"
              gradient="from-blue-500 to-cyan-500"
            />
            <p className="text-xs text-muted-foreground">invoices & receipts</p>
          </CardContent>
        </AnimatedCard>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <SplitText 
            text={title}
            className="text-3xl font-bold text-slate-900 dark:text-slate-100"
            delay={0.2}
            direction="up"
            trigger="onMount"
          />
          <FadeInText 
            text={subtitle}
            className="text-slate-600 dark:text-slate-400 mt-1"
            delay={0.5}
            direction="fade"
            trigger="onMount"
          />
        </div>
        <div className="flex items-center gap-4">
          {/* Data Sync Dropdown - RESTORED with full functionality */}
          <DataSyncDropdown
            progress={isEmailSyncing ? 50 : 0}
            dataQuality={dataQuality}
            onRefresh={() => refreshData()}
            isLoading={isLoading}
            error={null}
          />
          
          {/* Reset Sync Button - For debugging */}
          {isAnySyncInProgress && (
            <AnimatedButton
              onClick={() => {
                window.location.reload();
              }}
              variant="outline"
              size="sm"
              animation="shake"
              hoverEffect="glow"
              className="border-red-600 text-red-200 bg-red-900/20 hover:bg-red-800/30"
            >
              Reset Sync
            </AnimatedButton>
          )}
          
          {/* Sync Status Indicator */}
          <AnimatedCard 
            variant="glass" 
            className="px-3 py-2"
            animation="fadeIn"
            delay={0.3}
          >
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Calendar className="w-4 h-4" />
              <span>Status: {isAnySyncInProgress ? 'Syncing...' : 'Online'}</span>
              {isAnySyncInProgress && (
                <div className="flex items-center gap-1 text-blue-500">
                  <LoadingSpinner size="sm" variant="spinner" color="#3B82F6" />
                  <span className="text-xs">Processing Gmail data...</span>
                </div>
              )}
            </div>
          </AnimatedCard>

        </div>
      </div>

      {/* Re-authentication Banner */}
      <ReauthBanner />

      {/* Summary Cards - Only show if requested */}
      {showSummaryCards && (
        <ClientOnly fallback={<SummaryCardsFallback />}>
          <SummaryCardsContent />
        </ClientOnly>
      )}

      {/* Page Content */}
      {children}
    </div>
  );
}
