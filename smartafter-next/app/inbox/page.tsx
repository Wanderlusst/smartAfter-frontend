"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Scan, Receipt, Loader2, DollarSign, Calendar, Shield, FileText, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import PurchaseItem from '../components/PurchaseItem';
import InvoiceOCR from '../components/InvoiceOCR';
import PurchasesList from '../components/PurchasesList';
import { scanEmails } from '../services/emailScanner';
import UniversalUploader from '../components/UniversalUploader';
import BackgroundSyncIndicator from '../components/BackgroundSyncIndicator';
import { motion } from 'framer-motion';

interface Purchase {
  id: string;
  productName: string;
  store: string;
  price: number;
  purchaseDate: string;
  returnDeadline: string;
  warrantyStatus: string;
  hasInvoice: boolean;
  category: string;
  status: 'active' | 'expired' | 'pending';
}

const InboxScanner = () => {
  const [selectedStore, setSelectedStore] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [activeTab, setActiveTab] = useState<'email' | 'manual' | 'purchases'>('email');
  const [isScanning, setIsScanning] = useState(false);
  const [dateRange, setDateRange] = useState(30); // Default to 30 days

  const stores = ['all', 'Amazon', 'Flipkart', 'Myntra', 'Zomato', 'Apple Store', 'Nike'];

  // Real Gmail data - no sample data
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);


  // Fetch all invoice data (Gmail + Manual uploads) using unified API
  const fetchAllInvoiceData = async () => {
      try {
        setIsLoading(true);
        
      // Fetch unified data from both Gmail and manual uploads
      const response = await fetch(`/api/inbox-unified?maxResults=100&days=${dateRange}&t=${Date.now()}`);
        let allPurchases: Purchase[] = [];
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            console.log('📧 Unified inbox data received:', {
              total: data.data.purchaseCount,
              gmail: data.data.gmailCount,
              manual: data.data.manualCount,
              totalSpent: data.data.totalSpent
            });
            
            allPurchases = data.data.purchases.map((invoice: any) => {
              const amount = invoice.amount || 0;
              return {
                id: invoice.id || `unified-${Date.now()}-${Math.random()}`,
                productName: invoice.subject || 'Document',
                store: invoice.vendor || 'Unknown Store',
                price: typeof amount === 'string' ? 
                  parseFloat(amount.replace(/[₹,\s]/g, '')) || 0 : 
                  (amount || 0),
                purchaseDate: invoice.date || new Date().toISOString(),
                returnDeadline: new Date(new Date(invoice.date || new Date()).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                warrantyStatus: 'Active',
                hasInvoice: true,
                category: invoice.category || (invoice.source === 'manual_upload' ? 'Manual Upload' : 'Gmail Invoice'),
                status: 'active' as const,
                source: invoice.source || 'gmail',
                
                // Additional invoice data
                invoiceData: invoice.parsed_data || null,

                // Raw extracted text
                rawText: invoice.rawText || '',
                
                // Metadata
                metadata: invoice.metadata || {}
              };
            });
          }
        } else {
          console.error('Failed to fetch unified inbox data:', response.status);
        }

        setPurchases(allPurchases);
        
      } catch (error) {
        console.error('Error fetching unified invoice data:', error);
        setPurchases([]);
      } finally {
        setIsLoading(false);
      }
    };

  useEffect(() => {
    fetchAllInvoiceData();
  }, [dateRange]);

  const filteredAndSortedPurchases = useMemo(() => {
    let filtered = purchases;

    // Filter by store
    if (selectedStore !== 'all') {
      filtered = filtered.filter(purchase => purchase.store === selectedStore);
    }

    // Sort by selected criteria
    switch (sortBy) {
      case 'date':
        filtered = [...filtered].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
        break;
      case 'deadline':
        filtered = [...filtered].sort((a, b) => new Date(a.returnDeadline).getTime() - new Date(b.returnDeadline).getTime());
        break;
      case 'price':
        filtered = [...filtered].sort((a, b) => b.price - a.price);
        break;
      default:
        break;
    }

    return filtered;
  }, [purchases, selectedStore, sortBy]);

  const handleScanEmails = async () => {
    setIsScanning(true);
    try {
      toast.info('Scanning your emails with AI-powered PDF parsing...', {
        description: 'Using Python backend for real data extraction from PDF invoices'
      });
      
      // Refresh all data (Gmail + Manual uploads) with BACKEND ENHANCED processing
      const fetchAllInvoiceData = async () => {
        // Fetch Gmail invoices with Python backend processing
        const gmailResponse = await fetch(`/api/invoices-backend-enhanced?maxResults=100&days=${dateRange}`);
        let gmailPurchases: Purchase[] = [];
        
        if (gmailResponse.ok) {
          const gmailData = await gmailResponse.json();
          
          if (gmailData.success && gmailData.data.purchases) {
            gmailPurchases = gmailData.data.purchases.map((invoice: any) => {
              const amount = invoice.amount || 0;
              
              return {
                id: `gmail-${invoice.messageId || invoice.id}`,
                productName: invoice.subject,
                store: invoice.vendor,
                price: amount,
                purchaseDate: invoice.date,
                returnDeadline: new Date(new Date(invoice.date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                warrantyStatus: 'Active',
                hasInvoice: true,
                category: 'Gmail Invoice',
                status: 'active',
                
                // Enhanced data from backend
                invoiceNumber: invoice.invoiceNumber,
                documentType: invoice.documentType,
                confidence: invoice.confidence,
                source: invoice.source,
                
                // Invoice specific data
                invoiceData: invoice.invoiceData ? {
                  products: invoice.invoiceData.products || [],
                  taxAmount: invoice.invoiceData.taxAmount || 0,
                  paymentMethod: invoice.invoiceData.paymentMethod,
                  shippingCost: invoice.invoiceData.shippingCost || 0,
                  discount: invoice.invoiceData.discount || 0,
                  totalAmount: invoice.invoiceData.totalAmount || amount
                } : null,

                // Warranty specific data
                warrantyData: invoice.warrantyData ? {
                  productName: invoice.warrantyData.productName,
                  warrantyPeriod: invoice.warrantyData.warrantyPeriod,
                  warrantyStatus: invoice.warrantyData.warrantyStatus,
                  warrantyTerms: invoice.warrantyData.warrantyTerms
                } : null,

                // Refund specific data
                refundData: invoice.refundData ? {
                  refundAmount: invoice.refundData.refundAmount,
                  refundReason: invoice.refundData.refundReason,
                  refundStatus: invoice.refundData.refundStatus,
                  refundMethod: invoice.refundData.refundMethod
                } : null,

                // Raw extracted text
                rawText: invoice.rawText || '',
                
                // Metadata
                metadata: invoice.metadata || {}
              };
            });
          }
        }

        // Use cache service data instead of database API
        let manualPurchases: Purchase[] = [];
        
        try {
          // Import cache service to get data
          const { cacheService } = await import('../lib/cacheService');
          const cacheData = cacheService.getData();
          
          if (cacheData && cacheData.documents) {
            manualPurchases = cacheData.documents.map((doc: any) => ({
              id: doc.id,
              productName: doc.title || doc.subject || 'Document',
              store: doc.vendor || 'Unknown Store',
              price: typeof doc.amount === 'string' ? 
                parseFloat(doc.amount.replace(/[₹,\s]/g, '')) || 0 : 
                (doc.amount || 0),
              purchaseDate: doc.date || new Date().toISOString(),
              returnDeadline: new Date(new Date(doc.date || new Date()).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              warrantyStatus: 'Active',
              hasInvoice: true,
              category: doc.category || 'Other',
              status: 'active'
            }));
          }
        } catch (error) {
          console.warn('Cache service fetch failed:', error);
        }

        // Combine both sources
        const allPurchases = [...gmailPurchases, ...manualPurchases];
        setPurchases(allPurchases);
        
        return allPurchases;
      };

      const allPurchases = await fetchAllInvoiceData();
      
      toast.success(`Found ${allPurchases.length} purchases with real data!`, {
        description: 'Enhanced with AI-powered PDF parsing from Python backend'
      });
      
    } catch (error) {
      toast.error('Failed to scan emails', {
        description: 'Please try again later'
      });
    } finally {
      setIsScanning(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inbox Scanner</h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400">All your detected purchases, organized and ready for action.</p>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 p-1 bg-white/80 dark:bg-gray-800/80 rounded-xl shadow-sm w-fit mb-6"
        >
          <button
            onClick={() => setActiveTab('email')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              activeTab === 'email'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            Email Scanner
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              activeTab === 'manual'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            Manual Upload
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              activeTab === 'purchases'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            Added Purchases
          </button>
        </motion.div>

        <div className="w-full">
          {activeTab === 'purchases' ? (
            /* Added Purchases Tab */
            <PurchasesList />
          ) : activeTab === 'manual' ? (
            /* Manual Upload Tab */
            <UniversalUploader 
              onUploadSuccess={(result) => {
                // Refresh the purchases list after successful upload
                if (result.stats && result.stats.processed > 0) {
                  toast.success(`Successfully processed ${result.stats.processed} invoice(s)!`, {
                    description: 'Your invoices have been added to the system'
                  });
                  // Refresh the data
                  fetchAllInvoiceData();
                } else if (result.stats && result.stats.failed > 0) {
                  toast.error(`Failed to process ${result.stats.failed} file(s)`, {
                    description: 'Some files could not be processed as invoices'
                  });
                }
              }}
              onUploadError={(error) => {
                toast.error('Upload failed', {
                  description: error
                });
              }}
            />
          ) : (
            /* Email Scanner Tab */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {/* Filters */}
              <Card className="border-0 bg-white/90 dark:bg-gray-900/90 shadow-lg rounded-xl mb-6">
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Store:</label>
                        <select
                          value={selectedStore}
                          onChange={(e) => setSelectedStore(e.target.value)}
                          className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
                        >
                          {stores.map(store => (
                            <option key={store} value={store}>
                              {store === 'all' ? 'All Stores' : store}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
                        >
                          <option value="date">Date</option>
                          <option value="deadline">Return Deadline</option>
                          <option value="price">Price</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range:</label>
                        <select
                          value={dateRange}
                          onChange={(e) => setDateRange(Number(e.target.value))}
                          className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
                        >
                          <option value={7}>Last 7 days</option>
                          <option value={30}>Last 30 days</option>
                          <option value={90}>Last 90 days</option>
                          <option value={365}>Last year</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleScanEmails} 
                        disabled={isScanning} 
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:from-blue-600 hover:to-indigo-700 transition-colors px-6 py-2 rounded-lg text-sm font-semibold"
                      >
                        {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
                        {isScanning ? 'Scanning...' : 'Scan Emails'}
                      </Button>
                      <Button 
                        onClick={() => {
                          console.log('🔄 Manual refresh triggered');
                          fetchAllInvoiceData();
                        }}
                        className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md hover:from-green-600 hover:to-green-700 transition-colors px-6 py-2 rounded-lg text-sm font-semibold"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Refresh Data
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-white/90 dark:bg-gray-900/90 shadow-lg rounded-xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatCurrency(filteredAndSortedPurchases.reduce((sum, p) => sum + p.price, 0))}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/90 dark:bg-gray-900/90 shadow-lg rounded-xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Purchases</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {filteredAndSortedPurchases.length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/90 dark:bg-gray-900/90 shadow-lg rounded-xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Active Warranties</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {filteredAndSortedPurchases.filter(p => p.warrantyStatus === 'Active').length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Purchases List */}
              <div className="min-h-[400px]">
                {isLoading ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-16"
                  >
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                      <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                    </div>
                    <p className="text-lg text-gray-500 dark:text-gray-400 font-medium text-center mb-2">Loading recent purchases...</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center">Scanning last 7 days of emails</p>
                  </motion.div>
                ) : filteredAndSortedPurchases.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-16"
                  >
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                      <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-lg text-gray-500 dark:text-gray-400 font-medium text-center mb-2">No purchases found matching your criteria.</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center">Try scanning your emails or uploading a receipt.</p>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAndSortedPurchases.map((purchase, idx) => (
                      <motion.div
                        key={purchase.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <Card className="bg-white/90 dark:bg-gray-900/90 shadow-lg rounded-xl hover:shadow-xl transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                  {purchase.productName}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {purchase.store}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-gray-900 dark:text-white">
                                  {formatCurrency(purchase.price)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {purchase.category}
                                </p>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600 dark:text-gray-400">
                                  Purchased: {new Date(purchase.purchaseDate).toLocaleDateString()}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2 text-sm">
                                <Shield className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600 dark:text-gray-400">
                                  {purchase.warrantyStatus}
                                </span>
                              </div>
                              
                              {purchase.hasInvoice && (
                                <div className="flex items-center gap-2 text-sm">
                                  <FileText className="w-4 h-4 text-green-500" />
                                  <span className="text-green-600 dark:text-green-400">
                                    Invoice Available
                                  </span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <BackgroundSyncIndicator />
    </div>
  );
};

export default InboxScanner; 