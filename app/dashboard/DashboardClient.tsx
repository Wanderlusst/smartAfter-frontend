"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, Package, FileText, RotateCcw } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import DashboardOverview from '../components/dashboard/DashboardOverview';
import PurchaseBreakdown from '../components/dashboard/PurchaseBreakdown';
import CategoryBreakdown from '../components/dashboard/CategoryBreakdown';
import Header from '../components/Header';

import { useDataStore } from '@/app/stores/dataStore';
import { useDocuments } from '@/app/hooks/useDocuments';
import { useLoading } from '@/app/contexts/LoadingContext';
import ProgressToast from '@/app/components/ProgressToast';
import ClientBackgroundProcessor from '@/app/components/ClientBackgroundProcessor';
import BackgroundSyncIndicator from '@/app/components/BackgroundSyncIndicator';
import { useBackgroundProgress } from '@/app/hooks/useBackgroundProgress';
import { toast } from 'sonner';
import { cacheService } from '@/app/lib/cacheService';
import { dataSyncService } from '@/app/lib/dataSyncService';
import { databaseSyncService } from '@/app/lib/databaseSyncService';
import { useOptimizedNavigation } from '@/app/lib/routeTransitions';
import RouteLoadingIndicator, { FullScreenLoadingOverlay } from '@/app/components/RouteLoadingIndicator';

// Helper function to get PROPER last 7 days date for Gmail search
function getLastWeekDate(): string {
  // FORCE 2024 DATE - server time is wrong showing 2025
  const today = new Date();
  const lastWeek = new Date();
  lastWeek.setDate(today.getDate() - 7);
  
  const year = lastWeek.getFullYear();
  const month = String(lastWeek.getMonth() + 1).padStart(2, '0');
  const day = String(lastWeek.getDate()).padStart(2, '0');
  
  const dateFilter = `${year}/${month}/${day}`;
  return dateFilter;
}

interface DashboardClientProps {
  session: any;
  initialData: any;
  initialEmails: any[];
}

export default function DashboardClient({ session, initialData, initialEmails }: DashboardClientProps) {
  const [mounted, setMounted] = useState(false);
  const [emails, setEmails] = useState<any[]>(() => Array.isArray(initialEmails) ? initialEmails : []);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const { data: clientSession, status } = useSession();
  const { setLoading } = useLoading();
  
  // Add optimized navigation for performance
  const { navigate, prefetchAndNavigate, preloadRoute, preloadRoutes } = useOptimizedNavigation();
  
  // Use centralized data store
  const { 
    purchases,
    refundOpportunities,
    warranties,
    documents,
    totalSpent,
    isInitialLoading,
    isEmailSyncing,
    emailSyncProgress,
    hasInitialData,
    error,
    fetchInitialData,
    refreshData,
    setAuthenticated,
    setInitialData,
    clearData,
  } = useDataStore();

  // Debug: Log store state (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🏪 STORE STATE DEBUG:', {
      documentsCount: Array.isArray(documents) ? documents.length : 0,
      totalSpent,
      hasInitialData,
      isInitialLoading
    });
  }

  // Use shared documents hook for consistent data - but only if we don't have direct Gmail data
  const hasDirectGmailData = initialData?.source === 'direct-gmail' && initialData?.purchases?.length > 0;
  const { data: documentsData } = useDocuments();
  const sharedDocuments = hasDirectGmailData ? [] : (documentsData?.documents || []);
  const documentsSummary = hasDirectGmailData ? { totalAmount: 0, totalDocuments: 0, vendors: 0 } : (documentsData?.summary || { totalAmount: 0, totalDocuments: 0, vendors: 0 });

  // Background progress tracking
  const backgroundProgress = useBackgroundProgress();

  // Function to trigger 3-month background sync
  const triggerBackgroundSync = async () => {
    try {
      console.log('🚀 Triggering 3-month background sync...');
      
      // Show initial toast
      toast.loading('Starting 3-month data sync...', {
        description: 'This may take a few minutes',
        duration: 2000,
        position: 'bottom-right'
      });

      // Trigger the background sync via API
      const response = await fetch('/api/dashboard-direct', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-cache'
      });

      if (response.ok) {
        console.log('✅ Background sync triggered successfully');
        // The progress will be tracked by the useBackgroundProgress hook
        // and toaster notifications will be shown automatically
      } else {
        throw new Error('Failed to trigger background sync');
      }
    } catch (error) {
      console.error('❌ Error triggering background sync:', error);
      toast.error('Failed to start background sync', {
        description: 'Please try again later',
        duration: 5000,
        position: 'bottom-right'
      });
    }
  };

  // CRITICAL: Set initial data immediately when component mounts to avoid empty state
  useEffect(() => {
    // Only set SSR shell data if we don't already have real data from API
    if (initialData?.source === 'ssr-shell' && !hasInitialData && purchases.length === 0) {
      setInitialData(initialData);
    }
    
    // Set authentication status
    if (session?.user?.email) {
      setAuthenticated(true);
    }
    
    // CRITICAL: Initialize store from cache if store is empty but cache has data
    if ((!documents || documents.length === 0) && !hasInitialData) {
      console.log('🔄 INITIALIZING STORE FROM CACHE - Store empty, checking cache');
      useDataStore.getState().initializeFromCache();
    }
  }, [initialData, hasInitialData, setInitialData, session?.user?.email, setAuthenticated]);

  // Load documents from database and cache service on mount
  useEffect(() => {
    const loadDocuments = async () => {
      if (typeof window !== 'undefined') {
        try {
          // First try to load from database
          const dbResult = await databaseSyncService.loadDocumentsFromDatabase();
          
          if (dbResult.success && dbResult.documents.length > 0) {
            console.log('📄 Loaded data from database:', {
              documentsCount: dbResult.documents.length,
              totalSpent: dbResult.totalSpent,
              source: dbResult.source
            });
            
            setInitialData({
              documents: dbResult.documents,
              purchases: dbResult.documents,
              totalSpent: dbResult.totalSpent,
              hasInitialData: true,
              source: 'database'
            });
          } else {
            // Fallback to cache service
            console.log('🔄 Loading documents from cache service on dashboard mount');
            const cacheData = cacheService.getData();
            if (cacheData && cacheData.documents.length > 0) {
              console.log('📄 Loaded documents from cache service:', cacheData.documents.length);
              setInitialData({
                documents: cacheData.documents,
                purchases: cacheData.purchases,
                totalSpent: cacheData.totalSpent,
                hasInitialData: cacheData.hasInitialData,
                source: 'cache-service'
              });
            }
          }
        } catch (error) {
          console.error('Error loading documents:', error);
        }
      }
    };

    loadDocuments();
  }, [setInitialData]);

  // Listen for background data updates
  useEffect(() => {
    const handleBackgroundDataUpdate = (event: CustomEvent) => {
      console.log('🔄 Background data updated, forcing re-render:', event.detail);
      // Force a re-render by updating the store
      useDataStore.setState({ lastSyncTime: new Date().toISOString() });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('backgroundDataUpdated', handleBackgroundDataUpdate as EventListener);
      return () => {
        window.removeEventListener('backgroundDataUpdated', handleBackgroundDataUpdate as EventListener);
      };
    }
  }, []);

  // Listen for data sync service updates
  useEffect(() => {
    const unsubscribe = dataSyncService.addListener((event) => {
      console.log('🔄 Data sync event in dashboard:', event.type, event);
      // Force a re-render by updating the store
      useDataStore.setState({ lastSyncTime: new Date().toISOString() });
    });

    return unsubscribe;
  }, []);


  // Fetch all dashboard data directly from Gmail (no Supabase storage)
  // Credit card data fetching completely disabled
  useEffect(() => {
    const fetchDirectEmailData = async () => {
      // Check if we already have data from cache/database first
      const cacheData = cacheService.getData();
      if (cacheData && cacheData.documents && cacheData.documents.length > 0) {
        console.log('🔄 Dashboard: Using cached data, skipping Gmail fetch:', cacheData.documents.length);
        return;
      }

      // Only fetch Gmail data if we don't have cached data
      console.log('🔄 Dashboard: No cached data, fetching from Gmail...');
      // Credit card data processing completely removed
      // Always fetch Gmail data
      
      try {
        setIsDataLoading(true);
        setLoading(true, 'Fetching real-time email data...');
        
        console.log('🚀 Fetching direct email data from Gmail...');
        const directDataResponse = await fetch('/api/dashboard-direct?days=7&maxResults=50&forceRefresh=true');
        console.log('📡 Direct Gmail API response status:', directDataResponse.status);
        const directData = await directDataResponse.json();
        
        if (directData.success && directData.data) {
          // Log the direct Gmail data received
          console.log('📧 Direct Gmail data received:', directData.data);
          console.log('📊 Summary:', directData.summary);
          console.log('📧 Purchases found:', directData.data.purchases?.length || 0);
          console.log('💰 Total spent:', directData.data.totalSpent);
          console.log('🎯 DIRECT GMAIL DATA WILL OVERRIDE ALL OTHER SOURCES');
          
          // Update the data store with REAL Gmail data
          setInitialData(directData.data);
          
          // Also update the cache service
          cacheService.setData({
            documents: directData.data.documents || directData.data.purchases || [],
            purchases: directData.data.purchases || [],
            totalSpent: directData.data.totalSpent || 0,
            hasInitialData: true,
            lastSyncTime: new Date().toISOString()
          });

          // Notify all pages of data update
          dataSyncService.updateDocuments(directData.data.documents || directData.data.purchases || [], 'dashboard-direct-fetch');

          // Save to database for persistence
          console.log('💾 DashboardClient: Preparing documents for database save:', {
            hasDocuments: !!directData.data.documents,
            documentsType: typeof directData.data.documents,
            isDocumentsArray: Array.isArray(directData.data.documents),
            documentsLength: directData.data.documents?.length || 0,
            hasPurchases: !!directData.data.purchases,
            purchasesType: typeof directData.data.purchases,
            isPurchasesArray: Array.isArray(directData.data.purchases),
            purchasesLength: directData.data.purchases?.length || 0,
            directDataKeys: Object.keys(directData.data || {})
          });

          const documentsToSave = directData.data.documents || directData.data.purchases || [];
          console.log('💾 DashboardClient: documentsToSave prepared:', {
            type: typeof documentsToSave,
            isArray: Array.isArray(documentsToSave),
            length: documentsToSave?.length || 0,
            value: documentsToSave
          });

          if (Array.isArray(documentsToSave) && documentsToSave.length > 0) {
            console.log('💾 DashboardClient: Saving documents to database:', documentsToSave.length);
            databaseSyncService.saveDocumentsToDatabase(documentsToSave);
          } else {
            console.warn('⚠️ DashboardClient: No valid documents to save:', {
              documentsToSave,
              reason: !Array.isArray(documentsToSave) ? 'not an array' : 'empty array'
            });
          }
          
          setIsDataLoading(false);
          setLoading(false);
          return;
        } else {
          console.error('❌ Direct Gmail data fetch failed:', directData.error);
          setInitialData({
            totalSpent: 0,
            purchaseCount: 0,
            purchases: [],
            documents: { total: 0, receipts: 0, invoices: 0 },
            refundOpportunities: [],
            warranties: [],
            hasInitialData: false,
            source: 'direct-gmail-error',
            message: 'Direct Gmail data error: ' + (directData.error || 'Unknown error')
          });
          setIsDataLoading(false);
          setLoading(false);
          return;
        }
        
        // Fallback to old method if direct fetch fails
        console.log('🔄 Falling back to invoices-with-attachments...');
        const gmailDataResponse = await fetch('/api/invoices-with-attachments');
        const gmailData = await gmailDataResponse.json();
        
        if (gmailData.success && gmailData.data) {
          setInitialData(gmailData.data);
          setIsDataLoading(false);
          setLoading(false);
          return;
        }
        
        // Final fallback
        const response = await fetch('/api/gmail-invoice-analysis-enhanced', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.success && result.data && result.data.invoices && result.data.invoices.length > 0) {
            // Filter out invalid invoices and transform the data
            const validInvoices = result.data.invoices.filter((invoice: any) => 
              invoice && invoice.messageId && (invoice.vendor || invoice.parsedInvoice?.vendor)
            );
            
            if (validInvoices.length === 0) {
              return;
            }
            
            // Transform the enhanced invoice data to match our expected format
            const transformedInvoices = validInvoices.map((invoice: any) => {
              // Handle both old and new data structures
              const vendor = invoice.vendor || invoice.parsedInvoice?.vendor || 'Unknown Vendor';
              const amount = invoice.amount || invoice.parsedInvoice?.total || 0;
              const invoiceNumber = invoice.invoiceNumber || invoice.parsedInvoice?.invoiceNumber || '';
              const confidence = invoice.confidence || invoice.parsedInvoice?.confidence || 0.5;
              const source = invoice.source || 'email';
              
              return {
                id: `enhanced_${invoice.messageId}`,
                messageId: invoice.messageId,
                date: invoice.date,
                vendor,
                amount: `₹${amount}`,
                subject: invoice.subject,
                invoiceNo: invoiceNumber,
                isInvoice: true,
                source,
                timestamp: invoice.date,
                confidence,
                geminiAnalysis: {
                  confidence,
                  source,
                  parsedData: {
                    vendor,
                    total: amount,
                    invoiceNumber
                  }
                }
              };
            });
            
            // Update the emails state with enhanced invoice data
            setEmails(transformedInvoices.map((inv: any) => ({
              id: inv.id,
              subject: inv.subject,
              amount: inv.amount,
              date: inv.date
            })));
            
            // Update the data store with enhanced invoice data
            setInitialData({
              totalSpent: transformedInvoices.reduce((sum: number, inv: any) => {
                const amount = parseFloat(inv.amount.toString().replace(/[^\d.]/g, '')) || 0;
                return sum + amount;
              }, 0),
              purchaseCount: transformedInvoices.length,
              purchases: transformedInvoices.map((invoice: any) => ({
                id: invoice.id,
                vendor: invoice.vendor,
                amount: parseFloat(invoice.amount.toString().replace(/[^\d.]/g, '')) || 0,
                date: invoice.date,
                isInvoice: invoice.isInvoice,
                confidence: invoice.confidence,
                source: invoice.source
              })),
              documents: { 
                total: transformedInvoices.length,
                invoices: transformedInvoices.filter((e: any) => e.isInvoice).length
              },
              refundOpportunities: [],
              warranties: []
            } as any);
            
            setIsDataLoading(false);
            return;
          } else {
          }
        } else {
          // Check if it's an authentication error
          if (response.status === 401) {
            // Set a flag to show Gmail connection prompt
            setInitialData({
              totalSpent: 0,
              purchaseCount: 0,
              purchases: [],
              documents: { total: 0, receipts: 0, invoices: 0 },
              refundOpportunities: [],
              warranties: [],
              hasInitialData: false,
              source: 'gmail-auth-required',
              message: 'Gmail authentication required'
            });
            setIsDataLoading(false);
            return;
          }
        }
        
        // Fallback to the old invoices endpoint if enhanced analysis fails
        const fallbackResponse = await fetch('/api/invoices?days=7');
        
        if (fallbackResponse.ok) {
          const invoiceData = await fallbackResponse.json();
          if (invoiceData.invoices && invoiceData.invoices.length > 0) {
            
            // Update the emails state with fallback invoice data
            setEmails(invoiceData.invoices.map((inv: any) => ({
              id: inv.id,
              subject: inv.subject,
              amount: inv.amount,
              date: inv.date
            })));
            
            // Update the data store with fallback invoice data
            setInitialData({
              totalSpent: invoiceData.totalAmount || 0,
              purchaseCount: invoiceData.invoices.length,
              purchases: invoiceData.invoices.map((invoice: any) => ({
                id: invoice.id,
                vendor: invoice.vendor,
                amount: parseFloat(invoice.amount.toString().replace(/[^\d.]/g, '')) || 0,
                date: invoice.date,
                isInvoice: invoice.isInvoice
              })),
              documents: { 
                total: invoiceData.invoices.length,
                invoices: invoiceData.invoices.filter((e: any) => e.isInvoice).length
              },
              refundOpportunities: [],
              warranties: []
            } as any);
            
            setIsDataLoading(false);
            return;
          }
        }
        
        // If all else fails, show empty state
        setIsDataLoading(false);
        
      } catch (error) {
        setIsDataLoading(false);
      }
    };

    // Fetch direct email data to populate the dashboard
    fetchDirectEmailData();
  }, []); // Only run once on mount, not on every route change

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle SSR initial data setup and clear credit card cache
  useEffect(() => {
    // Clear any cached credit card data immediately on mount
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('creditCardSettings');
        localStorage.removeItem('smartafter-dashboard-cache');
        sessionStorage.removeItem('dashboard-data-loaded');
        console.log('🧹 Cleared credit card cache on mount');
      } catch (error) {
        console.log('⚠️ Could not clear localStorage on mount:', error);
      }
    }
    
    if (initialData && initialData.source) {
      // Set initial data in store
      setInitialData(initialData);
    }
  }, [initialData, setInitialData]);

  // Handle authentication status changes and clear credit card cache
  useEffect(() => {
    if (status === 'unauthenticated') {
      // Clear all cached data
      clearData();
    }
    
    // Clear any cached credit card data from localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('creditCardSettings');
        // Don't clear smartafter-dashboard-cache - keep it for persistence
        sessionStorage.removeItem('dashboard-data-loaded');
        console.log('🧹 Cleared credit card cache from localStorage');
      } catch (error) {
        console.log('⚠️ Could not clear localStorage:', error);
      }
    }
  }, [status, clearData]);

  // Persist data to cache service when store updates
  useEffect(() => {
    if (documents && documents.length > 0 && totalSpent > 0) {
      console.log('💾 PERSISTING DATA TO CACHE:', {
        documentsCount: documents.length,
        totalSpent,
        hasInitialData
      });
      
      cacheService.setData({
        documents,
        purchases: documents,
        totalSpent,
        hasInitialData,
        lastSyncTime: new Date().toISOString()
      });
    }
  }, [documents, totalSpent, hasInitialData]);

  // Prepare dashboard data with priority: Cache Service > Persistent Store > Background Store > Direct Gmail > Shared SWR > SSR
  // Credit Card analysis completely disabled - focus on email parsing only
  const dashboardData = useMemo(() => {
    // Credit card data processing completely removed
    // Only process Gmail-based email data
    
    // Process Gmail data - PRIORITIZE cache service data over everything else
    const cacheData = cacheService.getData();
    const hasCacheData = cacheData && cacheData.documents.length > 0;
    const hasPersistentDocuments = Array.isArray(documents) && documents.length > 0;
    const hasBackgroundDocuments = hasPersistentDocuments;
    const hasDirectGmailData = initialData?.source === 'direct-gmail' && initialData?.purchases?.length > 0;
    
    // Debug: Log what data sources we have
    console.log('🔍 DASHBOARD DATA SOURCES DEBUG:', {
      hasCacheData,
      cacheDocumentsCount: cacheData?.documents.length || 0,
      hasPersistentDocuments,
      hasBackgroundDocuments,
      backgroundDocumentsCount: Array.isArray(documents) ? documents.length : 0,
      hasDirectGmailData,
      directGmailDataCount: initialData?.purchases?.length || 0,
      sharedDocumentsCount: sharedDocuments?.length || 0,
      documentsArray: Array.isArray(documents) ? documents.slice(0, 2) : documents, // Show first 2 for debugging
      initialData: initialData?.source,
      storeDocuments: Array.isArray(documents) ? documents.slice(0, 2) : documents,
      cacheServiceCheck: typeof window !== 'undefined' ? localStorage.getItem('smartafter-dashboard-cache')?.length : 'N/A'
    });
    
    // If we have cache service data, use it exclusively (highest priority)
    if (hasCacheData) {
      console.log('🎯 USING CACHE SERVICE DATA - Highest priority data source');
      console.log('📊 Cache service data details:', {
        count: cacheData.documents.length,
        firstDocument: cacheData.documents[0],
        totalAmount: cacheData.totalSpent
      });
      
      const effectiveData = {
        source: 'cache-service',
        totalSpent: cacheData.totalSpent,
        purchaseCount: cacheData.documents.length,
        activeWarranties: 0, // Cache service documents don't have warranty info
        purchases: cacheData.documents,
        refunds: [],
        warranties: [],
        documents: { 
          total: cacheData.documents.length,
          receipts: Math.floor(cacheData.documents.length * 0.7),
          invoices: Math.floor(cacheData.documents.length * 0.3)
        },
        refundable: { amount: 0 }
      };

      console.log('🔍 CACHE SERVICE DATA - Counts:', {
        hasCacheData: true,
        totalSpent: effectiveData.totalSpent,
        purchaseCount: effectiveData.purchaseCount,
        purchasesLength: effectiveData.purchases.length,
        documentsCount: cacheData.documents.length,
        source: 'cache-service'
      });

      return effectiveData;
    }
    
    // If we have persistent store documents, use them exclusively (highest priority)
    if (hasPersistentDocuments) {
      console.log('🎯 USING PERSISTENT STORE DOCUMENTS - Highest priority data source');
      console.log('📊 Persistent store documents details:', {
        count: documents.length,
        firstDocument: documents[0],
        totalAmount: documents.reduce((sum, doc) => {
          const amount = typeof doc.amount === 'string' ? 
            parseFloat(doc.amount.replace(/[₹,\s]/g, '')) || 0 : 
            (doc.amount || 0);
          return sum + amount;
        }, 0)
      });
      
      const effectiveData = {
        source: 'persistent-store',
        totalSpent: documents.reduce((sum, doc) => {
          const amount = typeof doc.amount === 'string' ? 
            parseFloat(doc.amount.replace(/[₹,\s]/g, '')) || 0 : 
            (doc.amount || 0);
          return sum + amount;
        }, 0),
        purchaseCount: documents.length,
        activeWarranties: 0, // Persistent store documents don't have warranty info
        purchases: documents,
        refunds: [],
        warranties: [],
        documents: { 
          total: documents.length,
          receipts: Math.floor(documents.length * 0.7),
          invoices: Math.floor(documents.length * 0.3)
        },
        refundable: { amount: 0 }
      };

      console.log('🔍 PERSISTENT STORE DOCUMENTS - Counts:', {
        hasPersistentDocuments: true,
        totalSpent: effectiveData.totalSpent,
        purchaseCount: effectiveData.purchaseCount,
        purchasesLength: effectiveData.purchases.length,
        documentsCount: documents.length,
        source: 'persistent-store'
      });

      return effectiveData;
    }
    
    // If we have direct Gmail data, use it exclusively and ignore SWR data
    if (hasDirectGmailData) {
      console.log('🎯 USING DIRECT GMAIL DATA - Ignoring SWR data');
      
      const effectiveData = {
        source: 'direct-gmail',
        totalSpent: initialData?.totalSpent || 0,
        purchaseCount: initialData?.purchaseCount || 0,
        activeWarranties: initialData?.activeWarranties || initialData?.warranties?.length || 0,
        purchases: initialData?.purchases || [],
        refunds: initialData?.refundOpportunities || [],
        warranties: initialData?.warranties || [],
        documents: initialData?.documents || { total: 0, receipts: 0, invoices: 0 },
        refundable: initialData?.refundable || { amount: 0 }
      };

      console.log('🔍 DIRECT GMAIL DATA - Counts:', {
        hasDirectGmailData: true,
        totalSpent: effectiveData.totalSpent,
        purchaseCount: effectiveData.purchaseCount,
        purchasesLength: effectiveData.purchases.length,
        warrantiesLength: effectiveData.warranties.length,
        refundsLength: effectiveData.refunds.length
      });

      return effectiveData;
    }
    
    // Fallback to other sources only if no background documents or direct Gmail data
    const documentsCount = sharedDocuments.length || initialData?.documents?.total || 0;
    const documentsTotal = documentsSummary.totalAmount || initialData?.totalSpent || totalSpent || 0;
    
    const actualPurchaseCount = Math.max(
      sharedDocuments.length,
      initialData?.purchaseCount || 0,
      purchases.length,
      documentsCount
    );
    
    // Debug logging for fallback
    console.log('🔍 FALLBACK DATA - Counts:', {
      hasDirectGmailData: false,
      hasBackgroundDocuments: false,
      sharedDocuments: sharedDocuments.length,
      initialPurchaseCount: initialData?.purchaseCount || 0,
      purchasesLength: purchases.length,
      documentsCount,
      actualPurchaseCount
    });

    const effectiveData = {
      source: sharedDocuments.length > 0 ? 'shared-swr' : initialData?.source || 'store-data',
      totalSpent: documentsTotal,
      purchaseCount: actualPurchaseCount,
      activeWarranties: initialData?.activeWarranties || initialData?.warranties?.length || warranties.length || 0,
      purchases: sharedDocuments.length > 0 ? sharedDocuments : initialData?.purchases || purchases || [],
      refunds: initialData?.refundOpportunities || refundOpportunities || [],
      warranties: initialData?.warranties || warranties || [],
      documents: { 
        total: documentsCount,
        receipts: Math.floor(documentsCount * 0.7),
        invoices: Math.floor(documentsCount * 0.3)
      },
      refundable: initialData?.refundable || { amount: 0 }
    };

    return effectiveData;
  }, [initialData, totalSpent, purchases, refundOpportunities, warranties, documents, sharedDocuments, documentsSummary]);

  // Manual refresh function
  const handleManualRefresh = useCallback(async () => {
    try {
      console.log('🔄 Manual refresh triggered - fetching invoices with PDF attachments...');
      setLoading(true, 'Refreshing invoice data...');
      
      // Fetch fresh invoice data with PDF attachments
      const fetchDirectEmailData = async () => {
        try {
          setIsDataLoading(true);
          
          // Get invoices with PDF attachments
          const gmailDataResponse = await fetch('/api/invoices-with-attachments');
          const gmailData = await gmailDataResponse.json();
          
          if (gmailData.success && gmailData.data) {
            // Log parsed emails summary
            const purchases = gmailData.data.purchases || [];
            const totalAmount = purchases.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);
            
            console.log('📧 EMAIL_PARSING_COMPLETE:', {
              totalEmails: purchases.length,
              totalAmount: `₹${totalAmount}`,
              vendors: [...new Set(purchases.map((p: any) => p.vendor))].slice(0, 5)
            });
            
            // Update the data store with REAL Gmail data
            setInitialData(gmailData.data);
            
            setIsDataLoading(false);
            setLoading(false);
            return;
          } else {
            console.error('❌ Gmail data failed:', gmailData.error);
            setInitialData({
              totalSpent: 0,
              purchaseCount: 0,
              purchases: [],
              documents: { total: 0, receipts: 0, invoices: 0 },
              refundOpportunities: [],
              warranties: [],
              hasInitialData: false,
              source: 'gmail-error',
              message: 'Gmail data error: ' + (gmailData.error || 'Unknown error')
            });
            setIsDataLoading(false);
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('❌ Error fetching invoice data:', error);
          setIsDataLoading(false);
          setLoading(false);
        }
      };
      
      await fetchDirectEmailData();
    } catch (error) {
      console.error('❌ Error in manual refresh:', error);
      setLoading(false);
    }
  }, [setInitialData, setIsDataLoading]);

  // Manual sync function
  const handleManualSync = useCallback(async () => {
    try {
      await fetchInitialData(session?.user?.email, 7);
    } catch (error) {
      // Handle error silently
    }
  }, [fetchInitialData, session?.user?.email]);

  // Check if we have data to show - prioritize cache service data
  const cacheData = cacheService.getData();
  const hasCacheData = !!(cacheData && cacheData.documents.length > 0);
  const hasAnyData = !!(hasCacheData || documents.length > 0 || initialData || purchases.length > 0 || totalSpent > 0 || sharedDocuments.length > 0);
  const hasPartialData = !!(hasCacheData || documents.length > 0 || initialData?.source || purchases.length > 0 || sharedDocuments.length > 0);
  const hasSSRData = !!initialData?.source;
  const hasStoreData = !!(documents.length > 0 || purchases.length > 0 || totalSpent > 0 || sharedDocuments.length > 0);
  const hasSharedData = sharedDocuments.length > 0;
  const hasBackgroundData = hasCacheData || documents.length > 0;
  
  // Check authentication status
  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';
  
  // Show sign-in prompt if not authenticated
  if (!isLoading && !isAuthenticated) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-6 max-w-md">
            <div className="w-20 h-20 mx-auto bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Authentication Required</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please sign in with your Google account to access your purchase dashboard and Gmail data.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/api/auth/signin'}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                🔐 Sign in with Google
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                You'll be redirected to Google to grant Gmail access
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <>
        <Header />
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
            </div>
          </div>
        </DashboardLayout>
      </>
    );
  }
  
  return (
    <>
      <Header />
      <ClientBackgroundProcessor />
      <ProgressToast />
      <DashboardLayout>
        <div className="space-y-6">
        {/* Dashboard Content */}
        <div className="space-y-6">
          {/* Loading state is now handled by the header loading indicator */}
          


          {/* Dashboard Overview */}
          <DashboardOverview 
            data={dashboardData}
            initialData={initialData}
            onRefresh={handleManualRefresh}
            onManualSync={triggerBackgroundSync}
          />
          
          {/* Purchase Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PurchaseBreakdown 
              data={dashboardData}
              purchases={dashboardData.purchases}
              totalSpent={dashboardData.totalSpent}
            />
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Category Breakdown
              </h3>
              <CategoryBreakdown 
                categoryData={dashboardData.purchases.length > 0 ? dashboardData.purchases.map((purchase: any) => ({
                  name: (purchase as any).category || 'Other',
                  amount: typeof purchase.amount === 'string' ? parseFloat(purchase.amount.replace(/[₹,\s]/g, '')) || 0 : purchase.amount || 0,
                  value: typeof purchase.amount === 'string' ? parseFloat(purchase.amount.replace(/[₹,\s]/g, '')) || 0 : purchase.amount || 0,
                  color: '#3B82F6',
                  percentage: 0, // Will be calculated in component
                  items: 1,
                  trend: 'stable'
                })) : []}
                onDrillDown={() => {}}
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>

    {/* Performance Loading Indicators */}
    <RouteLoadingIndicator
      loadingState="idle"
      currentRoute=""
      isVisible={false}
    />
    
    <FullScreenLoadingOverlay
      loadingState="idle"
      currentRoute=""
    />
    </>
  );
} 