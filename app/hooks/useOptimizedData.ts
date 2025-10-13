'use client';

import { useMemo } from 'react';
import { useDataStore } from '../stores/dataStore';

// Optimized hook for purchases data
export function usePurchases() {
  const {
    purchases,
    totalSpent,
    isLoading,
    error,
    fetchPurchases,
    addPurchase,
    updatePurchase,
    deletePurchase
  } = useDataStore();

  // Memoized calculations for better performance
  const purchaseStats = useMemo(() => {
    const purchaseCount = purchases.length;
    const averageSpent = purchaseCount > 0 ? totalSpent / purchaseCount : 0;
    
    // Monthly spending calculation
    const monthlySpending = purchases.reduce((acc, purchase) => {
      const date = new Date(purchase.date || purchase.purchase_date || Date.now());
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey, amount: 0, count: 0 };
      }
      
      const amount = parseFloat(purchase.amount?.replace(/[₹,\s]/g, '') || '0');
      acc[monthKey].amount += amount;
      acc[monthKey].count += 1;
      
      return acc;
    }, {} as Record<string, { month: string; amount: number; count: number }>);

    return {
      purchaseCount,
      averageSpent,
      monthlySpending: Object.values(monthlySpending).sort((a, b) => a.month.localeCompare(b.month))
    };
  }, [purchases, totalSpent]);

  return {
    purchases,
    totalSpent,
    isLoading,
    error,
    ...purchaseStats,
    // Actions
    refetch: fetchPurchases,
    addPurchase,
    updatePurchase,
    deletePurchase,
    mutate: fetchPurchases // For compatibility with existing code
  };
}

// Optimized hook for refunds data
export function useRefunds() {
  const {
    refundOpportunities,
    completedRefunds,
    isLoading,
    error,
    fetchRefunds,
    addRefund,
    updateRefund
  } = useDataStore();

  const refundStats = useMemo(() => {
    const totalOpportunities = refundOpportunities.length;
    const urgentRefunds = refundOpportunities.filter(r => r.status === 'urgent').length;
    const totalPotentialAmount = refundOpportunities.reduce((sum, refund) => {
      const amount = parseFloat(refund.amount?.replace(/[₹,\s]/g, '') || '0');
      return sum + amount;
    }, 0);

    const completedAmount = completedRefunds.reduce((sum, refund) => {
      const amount = parseFloat(refund.amount?.replace(/[₹,\s]/g, '') || '0');
      return sum + amount;
    }, 0);

    return {
      totalOpportunities,
      urgentRefunds,
      totalPotentialAmount,
      completedAmount,
      completedCount: completedRefunds.length
    };
  }, [refundOpportunities, completedRefunds]);

  return {
    refundOpportunities,
    completedRefunds,
    isLoading,
    error,
    ...refundStats,
    // Actions
    refetch: fetchRefunds,
    addRefund,
    updateRefund,
    mutate: fetchRefunds
  };
}

// Optimized hook for warranties data
export function useWarranties() {
  const {
    warranties,
    warrantyClaims,
    isLoading,
    error,
    fetchWarranties,
    addWarranty,
    updateWarranty
  } = useDataStore();

  const warrantyStats = useMemo(() => {
    const now = new Date();
    const activeWarranties = warranties.filter(w => w.status === 'active').length;
    const expiringWarranties = warranties.filter(w => w.status === 'expiring').length;
    const expiredWarranties = warranties.filter(w => w.status === 'expired').length;

    // Calculate warranties expiring soon (within 30 days)
    const expiringSoon = warranties.filter(w => {
      const expiryDate = new Date(w.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    }).length;

    return {
      totalWarranties: warranties.length,
      activeWarranties,
      expiringWarranties,
      expiredWarranties,
      expiringSoon,
      totalClaims: warrantyClaims.length
    };
  }, [warranties, warrantyClaims]);

  return {
    warranties,
    warrantyClaims,
    isLoading,
    error,
    ...warrantyStats,
    // Actions
    refetch: fetchWarranties,
    addWarranty,
    updateWarranty,
    mutate: fetchWarranties
  };
}

// Optimized hook for documents data
export function useDocuments() {
  const { documents, isLoading, error } = useDataStore();

  const documentStats = useMemo(() => {
    // Ensure documents is an array
    const documentsArray = Array.isArray(documents) ? documents : [];
    
    const totalDocuments = documentsArray.length;
    const invoiceCount = documentsArray.filter(d => d.has_invoice).length;
    const receiptCount = totalDocuments - invoiceCount;

    return {
      totalDocuments,
      invoiceCount,
      receiptCount,
      documents: {
        receipts: receiptCount,
        invoices: invoiceCount,
        total: totalDocuments
      }
    };
  }, [documents]);

  return {
    documents: Array.isArray(documents) ? documents : [],
    isLoading,
    error,
    totalDocuments: documentStats.totalDocuments,
    invoiceCount: documentStats.invoiceCount,
    receiptCount: documentStats.receiptCount,
    documentsBreakdown: documentStats.documents
  };
}

// Optimized hook for overall dashboard data
export function useDashboardData() {
  const {
    purchases,
    refundOpportunities,
    warranties,
    documents,
    totalSpent,
    isLoading,
    error,
    hasInitialData
  } = useDataStore();

  const dashboardStats = useMemo(() => {
    // Ensure documents is an array
    const documentsArray = Array.isArray(documents) ? documents : [];
    
    // Calculate category breakdown
    const categories = purchases.reduce((acc, purchase) => {
      // Simple category detection based on vendor
      let category = 'Other';
      const vendor = (purchase.vendor || '').toLowerCase();
      
      if (vendor.includes('swiggy') || vendor.includes('zomato') || vendor.includes('food')) {
        category = 'Food & Dining';
      } else if (vendor.includes('amazon') || vendor.includes('flipkart') || vendor.includes('myntra')) {
        category = 'Shopping';
      } else if (vendor.includes('uber') || vendor.includes('ola')) {
        category = 'Transportation';
      } else if (vendor.includes('netflix') || vendor.includes('spotify')) {
        category = 'Entertainment';
      }

      if (!acc[category]) {
        acc[category] = { name: category, amount: 0, count: 0 };
      }

      const amount = parseFloat(purchase.amount?.replace(/[₹,\s]/g, '') || '0');
      acc[category].amount += amount;
      acc[category].count += 1;

      return acc;
    }, {} as Record<string, { name: string; amount: number; count: number }>);

    const categoryData = Object.values(categories).map(category => ({
      ...category,
      percentage: totalSpent > 0 ? (category.amount / totalSpent) * 100 : 0,
      color: getCategoryColor(category.name)
    }));

    return {
      purchaseCount: purchases.length,
      refundOpportunities: refundOpportunities.length,
      activeWarranties: warranties.filter(w => w.status === 'active').length,
      documentCount: documentsArray.length,
      categories: categoryData
    };
  }, [purchases, refundOpportunities, warranties, documents, totalSpent]);

  return {
    ...dashboardStats,
    totalSpent,
    isLoading,
    error,
    hasInitialData,
    loading: isLoading // For backward compatibility
  };
}

// Helper function for category colors
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Food & Dining': '#f97316',
    'Shopping': '#3b82f6',
    'Transportation': '#10b981',
    'Entertainment': '#ef4444',
    'Healthcare': '#8b5cf6',
    'Utilities': '#6b7280',
    'Investment': '#059669',
    'Digital': '#6366f1',
    'Other': '#6b7280'
  };
  return colors[category] || '#6b7280';
}

// Performance-optimized search hook
export function useSearchPurchases(searchQuery: string, filters: Record<string, any> = {}) {
  const { purchases } = useDataStore();

  const filteredPurchases = useMemo(() => {
    if (!searchQuery && Object.keys(filters).length === 0) {
      return purchases;
    }

    return purchases.filter(purchase => {
      // Search filter
      const matchesSearch = !searchQuery || 
        purchase.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.product_name?.toLowerCase().includes(searchQuery.toLowerCase());

      // Additional filters
      const matchesFilters = Object.entries(filters).every(([key, value]) => {
        if (!value || value === 'all') return true;
        
        switch (key) {
          case 'vendor':
            return purchase.vendor === value || purchase.store === value;
          case 'dateRange':
            // Implement date range filtering
            return true;
          case 'amountRange':
            // Implement amount range filtering
            return true;
          default:
            return true;
        }
      });

      return matchesSearch && matchesFilters;
    });
  }, [purchases, searchQuery, filters]);

  return filteredPurchases;
} 