'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { 
  FileText, 
  Receipt, 
  Download, 
  Search,
  Calendar,
  DollarSign,
  Building2,
  Eye,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  Zap,
  ShoppingBag,
  CreditCard,
  Filter,
  SortAsc,
  File,
  FileImage,
  FileVideo,
  FileSpreadsheet,
  FileCode,
  Archive,
  Paperclip,
  Mail,
  Clock,
  HardDrive,
  X,
  ExternalLink,
  Maximize2
} from 'lucide-react';
import { useDataStore } from '@/app/stores/dataStore';
import { useDocuments } from '@/app/hooks/useDocuments';
import { useSession } from 'next-auth/react';
import { useSidebar } from '@/app/components/SidebarContext';
import { cacheService } from '@/app/lib/cacheService';
import { dataSyncService } from '@/app/lib/dataSyncService';
import { databaseSyncService } from '@/app/lib/databaseSyncService';

interface Document {
  id: string;
  vendor: string;
  amount: string;
  date: string;
  subject: string;
  isInvoice: boolean;
  messageId?: string;
  name?: string;
  title?: string;
  type?: string;
  category?: string;
  size?: string;
  mimeType?: string;
  emailSubject?: string;
  emailFrom?: string;
  emailDate?: string;
  attachmentId?: string;
  isPdf?: boolean;
  source?: string;
  geminiAnalysis?: {
    confidence: number;
    source: string;
    parsedData: {
      invoiceNumber?: string | null;
      orderNumber?: string | null;
      subtotal?: string;
      taxes?: string;
      shipping?: string;
      items?: { name: string; quantity: string; price: string }[];
      paymentMethod?: string;
      dueDate?: string;
    };
    attachmentCount: number;
    pdfAttachments: string[];
  };
}

interface DocumentsClientProps {
  session: any;
  initialDocuments: Document[];
  totalCount: number;
}

export default function DocumentsClient({ session, initialDocuments, totalCount }: DocumentsClientProps) {
  const { documents: storeDocuments } = useDataStore();
  const { data: clientSession, status } = useSession();
  const { setCollapsed } = useSidebar();
  
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'vendor'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Use shared SWR hook
  const { data, error, mutate, isLoading, isValidating } = useDocuments();
  
  // Load documents from database and clear caches on mount
  useEffect(() => {
    const loadDocuments = async () => {
      if (typeof window !== 'undefined') {
        try {
          // No longer clearing localStorage - using Supabase for persistence
          sessionStorage.removeItem('dashboard-data-loaded');
          console.log('🧹 Cleared credit card cache from documents page');
          
          // First try to get data from the store (which should have the latest data)
          console.log('🔄 Documents page: Checking store data first...');
          if (storeDocuments && storeDocuments.length > 0) {
            console.log('✅ Found store documents:', storeDocuments.length);
            setDbData({
              documents: storeDocuments,
              totalSpent: storeDocuments.reduce((sum: number, doc: any) => {
                const amount = typeof doc.amount === 'string' ? 
                  parseFloat(doc.amount.replace(/[₹,\s]/g, '')) || 0 : 
                  (doc.amount || 0);
                return sum + amount;
              }, 0),
              source: 'store'
            });
            return;
          }
          
          // Load from database/cache
          console.log('🔄 Documents page: Loading from database...');
          const dbResult = await databaseSyncService.loadDocumentsFromDatabase();
          console.log('📄 Database result:', {
            success: dbResult.success,
            documentsCount: dbResult.documents?.length || 0,
            source: dbResult.source,
            message: dbResult.message,
            firstDocument: dbResult.documents?.[0]
          });
          
          if (dbResult.success && dbResult.documents.length > 0) {
            console.log('✅ Loaded documents from database:', dbResult.documents.length);
            setDbData(dbResult);
          } else {
            console.log('⚠️ Database load failed or empty, trying cache...');
            // Fallback to cache
            const cacheData = cacheService.getData();
            console.log('📄 Cache data:', {
              exists: !!cacheData,
              documentsCount: cacheData?.documents?.length || 0,
              firstDocument: cacheData?.documents?.[0]
            });
            
            if (cacheData && cacheData.documents.length > 0) {
              console.log('✅ Loaded documents from cache:', cacheData.documents.length);
              setDbData(cacheData);
            } else {
              console.log('❌ No data available from database or cache');
            }
          }
        } catch (error) {
          console.log('⚠️ Error loading documents:', error);
        }
      }
    };

    loadDocuments();
  }, [storeDocuments]); // Add storeDocuments as dependency

  // Listen for background data updates
  useEffect(() => {
    const handleBackgroundDataUpdate = (event: CustomEvent) => {
      console.log('🔄 Background data updated in documents page, forcing re-render:', event.detail);
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

  // Listen for cache service updates
  useEffect(() => {
    const unsubscribe = cacheService.addListener(() => {
      console.log('🔄 Cache service updated in documents page, forcing re-render');
      // Force a re-render by updating the store
      useDataStore.setState({ lastSyncTime: new Date().toISOString() });
    });

    return unsubscribe;
  }, []);

  // Listen for data sync service updates
  useEffect(() => {
    const unsubscribe = dataSyncService.addListener((event) => {
      console.log('🔄 Data sync event in documents page:', event.type, event);
      // Force a re-render by updating the store
      useDataStore.setState({ lastSyncTime: new Date().toISOString() });
    });

    return unsubscribe;
  }, []);
  
  // PRIORITIZE database > cache service data > store documents > API data
  const [dbData, setDbData] = useState<any>(null);
  const cacheData = cacheService.getData();
  const hasDbData = dbData && dbData.documents && dbData.documents.length > 0;
  const hasCacheData = cacheData && cacheData.documents.length > 0;
  const hasBackgroundDocuments = Array.isArray(storeDocuments) && storeDocuments.length > 0;
  
  // Data source priority: Database > Cache Service > Store Documents > API Data
  const documents = hasDbData ? dbData.documents :
                   hasCacheData ? cacheData.documents : 
                   hasBackgroundDocuments ? storeDocuments : 
                   (data?.documents || initialDocuments);

  // COMPREHENSIVE DEBUG LOGGING
  console.log('🔍 DOCUMENTS DEBUG - Data sources:', {
    hasDbData,
    hasCacheData,
    hasBackgroundDocuments,
    dbDocumentsCount: dbData?.documents?.length || 0,
    cacheDocumentsCount: cacheData?.documents?.length || 0,
    storeDocumentsCount: storeDocuments?.length || 0,
    apiDocumentsCount: data?.documents?.length || 0,
    initialDocumentsCount: initialDocuments?.length || 0,
    finalDocumentsCount: documents?.length || 0
  });

  // Debug the actual document structure (only in development)
  if (process.env.NODE_ENV === 'development' && documents && documents.length > 0) {
    console.log('🔍 DOCUMENTS DEBUG - Sample document structure:', {
      firstDocument: documents[0],
      hasMessageId: !!documents[0]?.messageId,
      hasAttachmentId: !!documents[0]?.attachmentId,
      messageId: documents[0]?.messageId,
      attachmentId: documents[0]?.attachmentId,
      allKeys: Object.keys(documents[0] || {})
    });
  }

  // Log document parsing summary
  if (documents && documents.length > 0) {
    const totalAmount = documents.reduce((sum: number, doc: any) => {
      const amount = parseFloat(doc.amount || doc.price || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    const vendors = [...new Set(documents.map((doc: any) => doc.vendor).filter(Boolean))];
    
    console.log('📧 DOCUMENTS_PARSED:', {
      totalDocuments: documents.length,
      totalAmount: `₹${totalAmount}`,
      uniqueVendors: vendors.length,
      topVendors: vendors.slice(0, 5),
      source: hasDbData ? 'database' : hasCacheData ? 'cache-service' : hasBackgroundDocuments ? 'background-store' : 'api-swr'
    });
  }
  
  // Calculate summary from actual documents
  const summary = Array.isArray(documents) ? {
    totalAmount: documents.reduce((sum: number, doc: any) => {
      const amount = typeof doc.amount === 'string' ? 
        parseFloat(doc.amount.replace(/[₹,\s]/g, '')) || 0 : 
        (doc.amount || 0);
      return sum + amount;
    }, 0),
    totalDocuments: documents.length,
    vendors: new Set(documents.map((doc: any) => doc.vendor)).size
  } : (data?.summary || { totalAmount: 0, totalDocuments: 0, vendors: 0 });

  console.log('📄 Documents page data source:', {
    hasDbData,
    dbDocumentsCount: dbData?.documents?.length || 0,
    hasCacheData,
    cacheDocumentsCount: cacheData?.documents.length || 0,
    hasBackgroundDocuments,
    storeDocumentsCount: Array.isArray(storeDocuments) ? storeDocuments.length : 0,
    apiDocumentsCount: data?.documents?.length || 0,
    finalDocumentsCount: Array.isArray(documents) ? documents.length : 0,
    source: hasDbData ? 'database' : hasCacheData ? 'cache-service' : hasBackgroundDocuments ? 'background-store' : 'api-swr',
    documents: Array.isArray(documents) ? documents.slice(0, 3) : documents // Show first 3 documents for debugging
  });


  // Note: We don't need to update store here since we're already using store data directly
  // The store data is the primary source, and SWR data is only used as fallback

  // Manual refresh function that updates SWR cache and cache service
  const refreshDocuments = async () => {
    // Clear all caches first
    if (typeof window !== 'undefined') {
      // No longer clearing localStorage - using Supabase for persistence
      sessionStorage.clear();
      console.log('🧹 Cleared all caches before refresh');
    }
    
    // Clear cache service
    cacheService.clearCache();
    
    await mutate(); // This will trigger a fresh fetch and update cache
  };

  // Handle view document
  const handleViewDocument = (doc: Document) => {
    setSelectedDocument(doc);
    setIsModalOpen(true);
    // Collapse sidebar for better modal visibility
    setCollapsed(true);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  };

  // Handle close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDocument(null);
    // Expand sidebar back when modal is closed
    setCollapsed(false);
    // Restore body scroll when modal is closed
    document.body.style.overflow = 'unset';
  };

  // Function to try to load missing attachment data
  const tryLoadAttachmentData = async (document: Document) => {
    console.log('🔍 Trying to load missing attachment data for document:', document.id);
    
    try {
      // Try to fetch the document details from the API
      const response = await fetch('/api/documents');
      if (response.ok) {
        const data = await response.json();
        const freshDocument = data.documents?.find((doc: Document) => doc.id === document.id);
        
        if (freshDocument && freshDocument.attachmentId && freshDocument.messageId) {
          console.log('✅ Found fresh attachment data:', {
            attachmentId: freshDocument.attachmentId,
            messageId: freshDocument.messageId
          });
          
          // Update the selected document with fresh data
          setSelectedDocument(prev => prev ? {
            ...prev,
            attachmentId: freshDocument.attachmentId,
            messageId: freshDocument.messageId
          } : null);
          
          return {
            attachmentId: freshDocument.attachmentId,
            messageId: freshDocument.messageId
          };
        }
      }
    } catch (error) {
      console.error('❌ Error loading fresh attachment data:', error);
    }
    
    return null;
  };

  // Handle open PDF in new tab
  const handleOpenPdf = async () => {
    // Check if we have the required data
    let hasAttachmentId = selectedDocument?.attachmentId;
    let hasMessageId = selectedDocument?.messageId;
    
    // If missing data, try to load it
    if (!hasAttachmentId || !hasMessageId) {
      console.log('🔍 Missing attachment data, attempting to load...');
      const freshData = await tryLoadAttachmentData(selectedDocument!);
      
      if (freshData) {
        hasAttachmentId = freshData.attachmentId;
        hasMessageId = freshData.messageId;
      }
    }
    
    if (!hasAttachmentId || !hasMessageId) {
      console.error('❌ Missing required data for PDF opening:', {
        hasAttachmentId: !!hasAttachmentId,
        hasMessageId: !!hasMessageId,
        document: selectedDocument,
        geminiAnalysis: selectedDocument?.geminiAnalysis
      });
      
      // Try to get attachment data from geminiAnalysis
      if (selectedDocument?.geminiAnalysis?.pdfAttachments && selectedDocument.geminiAnalysis.pdfAttachments.length > 0) {
        const pdfAttachment = selectedDocument.geminiAnalysis.pdfAttachments[0];
        console.log('🔍 Trying to use PDF attachment from geminiAnalysis:', pdfAttachment);
        
        // If we have a PDF attachment ID from gemini analysis, try to use it
        if (pdfAttachment && selectedDocument.messageId) {
          const pdfUrl = `/api/download-attachment?messageId=${selectedDocument.messageId}&attachmentId=${pdfAttachment}`;
          console.log('🔍 PDF URL from geminiAnalysis:', pdfUrl);
          
          try {
            const response = await fetch(pdfUrl);
            if (response.ok) {
              const newWindow = window.open(pdfUrl, '_blank');
              if (newWindow) {
                console.log('✅ PDF opened using geminiAnalysis data');
                return;
              }
            }
          } catch (error) {
            console.error('❌ Error opening PDF with geminiAnalysis data:', error);
          }
        }
      }
      
      // Show a more informative message
      const hasGeminiData = selectedDocument?.geminiAnalysis?.pdfAttachments && selectedDocument.geminiAnalysis.pdfAttachments.length > 0;
      const message = hasGeminiData 
        ? 'This document was processed but the attachment data is incomplete. The document may not have a downloadable PDF attachment.'
        : 'This document does not have downloadable attachment data. It may be a text-only email or the attachment data was not properly extracted.';
      
      alert(message);
      return;
    }

    try {
      console.log('🔍 Opening PDF:', {
        messageId: hasMessageId,
        attachmentId: hasAttachmentId,
        name: selectedDocument?.name,
        document: selectedDocument
      });
      
      // Create a download URL for the PDF
      const pdfUrl = `/api/download-attachment?messageId=${hasMessageId}&attachmentId=${hasAttachmentId}`;
      console.log('🔍 PDF URL:', pdfUrl);
      
      // Test the URL first
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to load PDF: ${response.status} ${response.statusText} - ${errorData.details || errorData.error}`);
      }
      
      // Open in new tab
      const newWindow = window.open(pdfUrl, '_blank');
      if (!newWindow) {
        console.error('❌ Failed to open new window - popup blocked?');
        alert('Please allow popups for this site to open PDFs');
      } else {
        console.log('✅ PDF opened in new tab successfully');
      }
    } catch (error: any) {
      console.error('❌ Error opening PDF:', error);
      alert(`Failed to open PDF: ${error.message}`);
    }
  };

  // Handle download attachment
  const handleDownloadAttachment = async () => {
    // Check if we have the required data
    let hasAttachmentId = selectedDocument?.attachmentId;
    let hasMessageId = selectedDocument?.messageId;
    
    // If missing data, try to load it
    if (!hasAttachmentId || !hasMessageId) {
      console.log('🔍 Missing attachment data for download, attempting to load...');
      const freshData = await tryLoadAttachmentData(selectedDocument!);
      
      if (freshData) {
        hasAttachmentId = freshData.attachmentId;
        hasMessageId = freshData.messageId;
      }
    }
    
    if (!hasAttachmentId || !hasMessageId) {
      console.error('❌ Missing required data for download:', {
        hasAttachmentId: !!hasAttachmentId,
        hasMessageId: !!hasMessageId,
        document: selectedDocument,
        geminiAnalysis: selectedDocument?.geminiAnalysis
      });
      
      // Try to get attachment data from geminiAnalysis
      if (selectedDocument?.geminiAnalysis?.pdfAttachments && selectedDocument.geminiAnalysis.pdfAttachments.length > 0) {
        const pdfAttachment = selectedDocument.geminiAnalysis.pdfAttachments[0];
        console.log('🔍 Trying to download using PDF attachment from geminiAnalysis:', pdfAttachment);
        
        // If we have a PDF attachment ID from gemini analysis, try to use it
        if (pdfAttachment && selectedDocument.messageId) {
          const downloadUrl = `/api/download-attachment?messageId=${selectedDocument.messageId}&attachmentId=${pdfAttachment}`;
          console.log('🔍 Download URL from geminiAnalysis:', downloadUrl);
          
          try {
            const response = await fetch(downloadUrl);
            if (response.ok) {
              const link = document.createElement('a');
              link.href = downloadUrl;
              link.download = selectedDocument.name || selectedDocument.title || 'attachment.pdf';
              link.target = '_blank';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              console.log('✅ Download initiated using geminiAnalysis data');
              return;
            }
          } catch (error) {
            console.error('❌ Error downloading with geminiAnalysis data:', error);
          }
        }
      }
      
      // Show a more informative message
      const hasGeminiData = selectedDocument?.geminiAnalysis?.pdfAttachments && selectedDocument.geminiAnalysis.pdfAttachments.length > 0;
      const message = hasGeminiData 
        ? 'This document was processed but the attachment data is incomplete. The document may not have a downloadable PDF attachment.'
        : 'This document does not have downloadable attachment data. It may be a text-only email or the attachment data was not properly extracted.';
      
      alert(message);
      return;
    }

    try {
      console.log('🔍 Downloading attachment:', {
        messageId: hasMessageId,
        attachmentId: hasAttachmentId,
        name: selectedDocument?.name
      });
      
      const downloadUrl = `/api/download-attachment?messageId=${hasMessageId}&attachmentId=${hasAttachmentId}`;
      console.log('🔍 Download URL:', downloadUrl);
      
      // Test the URL first
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Download failed: ${response.status} ${response.statusText} - ${errorData.details || errorData.error}`);
      }
      
      // Create download link
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = selectedDocument?.name || selectedDocument?.title || 'attachment.pdf';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Download initiated successfully');
    } catch (error: any) {
      console.error('❌ Error downloading attachment:', error);
      alert(`Failed to download attachment: ${error.message}`);
    }
  };

  // Use documents from SWR cache
  const displayDocuments = Array.isArray(documents) ? documents : [];

  // TEMPORARILY DISABLE DUPLICATE FILTERING TO SEE ALL DOCUMENTS
  const uniqueDocuments = displayDocuments; // Show all documents for now

  console.log('🔍 DUPLICATE FILTER DEBUG (DISABLED):', {
    totalDocuments: displayDocuments.length,
    uniqueDocuments: uniqueDocuments.length,
    removedCount: 0,
    sampleIds: displayDocuments.slice(0, 5).map(doc => ({ 
      id: doc.id, 
      messageId: doc.messageId, 
      vendor: doc.vendor,
      amount: doc.amount 
    }))
  });

  const filteredAndSortedDocuments = uniqueDocuments
    .filter((doc: Document) => {
      // Show ALL documents from background processing - don't filter by attachment fields
      // Background documents are already processed and should be shown
      const isBackgroundDocument = doc.source === 'background-processing' || 
                                  doc.source === 'dashboard-direct-fetch' ||
                                  doc.source === 'cache-only-mode' ||
                                  doc.source === 'database' ||
                                  doc.source === 'cache-service' ||
                                  doc.source === 'store';
      
      // For non-background documents, check for attachment indicators
      const hasAttachment = isBackgroundDocument || 
                           doc.attachmentId || doc.isPdf || doc.mimeType || doc.name || doc.type || 
                           (doc as any).attachmentFilename || (doc as any).attachmentMimeType || doc.isInvoice || 
                           doc.subject || doc.emailSubject;
      
      const matchesSearch = (doc.vendor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (doc.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (doc.emailSubject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (doc.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const passesFilter = hasAttachment && matchesSearch;
      
      // Debug each document
      if (!passesFilter) {
        console.log('❌ Document filtered out:', {
          id: doc.id,
          vendor: doc.vendor,
          source: doc.source,
          isBackgroundDocument,
          hasAttachment,
          matchesSearch,
          searchTerm
        });
      }
      
      return passesFilter;
    })

  
  console.log('📊 Filter results:', {
    totalDocuments: displayDocuments.length,
    uniqueDocuments: uniqueDocuments.length,
    filteredDocuments: filteredAndSortedDocuments.length,
    searchTerm: searchTerm || 'empty',
    sampleFilteredDocs: filteredAndSortedDocuments.slice(0, 3).map(doc => ({
      id: doc.id,
      vendor: doc.vendor,
      amount: doc.amount,
      source: doc.source
    }))
  });

  const finalDocuments = filteredAndSortedDocuments
    .sort((a: Document, b: Document) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'amount':
          aValue = parseFloat(a.amount.replace(/[₹,\s]/g, '') || '0');
          bValue = parseFloat(b.amount.replace(/[₹,\s]/g, '') || '0');
          break;
        case 'vendor':
          aValue = a.vendor.toLowerCase();
          bValue = b.vendor.toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Calculate totals
  const totalAmount = filteredAndSortedDocuments.reduce((sum: number, doc: Document) => {
    const amount = typeof doc.amount === 'string' 
      ? parseFloat(doc.amount.replace(/[₹,\s]/g, '') || '0')
      : (typeof doc.amount === 'number' ? doc.amount : 0);
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  const formatCurrency = (amount: string) => {
    if (!amount || amount === '₹0') return '₹0';
    return amount;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getVendorIcon = (vendor: string) => {
    const lowerVendor = vendor.toLowerCase();
    if (lowerVendor.includes('amazon')) return '🛒';
    if (lowerVendor.includes('flipkart')) return '🛍️';
    if (lowerVendor.includes('swiggy')) return '🍔';
    if (lowerVendor.includes('zomato')) return '🍕';
    if (lowerVendor.includes('uber')) return '🚗';
    if (lowerVendor.includes('ola')) return '🚕';
    if (lowerVendor.includes('paytm')) return '💳';
    if (lowerVendor.includes('phonepe')) return '📱';
    if (lowerVendor.includes('gpay')) return '💰';
    return '🏪';
  };

  const getFileTypeIcon = (mimeType: string, filename: string) => {
    if (mimeType?.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (mimeType?.includes('image')) return <FileImage className="w-5 h-5 text-blue-500" />;
    if (mimeType?.includes('video')) return <FileVideo className="w-5 h-5 text-purple-500" />;
    if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    if (mimeType?.includes('word') || mimeType?.includes('document')) return <FileText className="w-5 h-5 text-blue-600" />;
    if (mimeType?.includes('zip') || mimeType?.includes('rar')) return <Archive className="w-5 h-5 text-orange-500" />;
    if (filename?.toLowerCase().includes('.csv')) return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
    if (filename?.toLowerCase().includes('.txt')) return <FileCode className="w-5 h-5 text-gray-500" />;
    return <File className="w-5 h-5 text-gray-400" />;
  };

  const getFileTypeColor = (mimeType: string, filename: string) => {
    if (mimeType?.includes('pdf')) return 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400';
    if (mimeType?.includes('image')) return 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
    if (mimeType?.includes('video')) return 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400';
    if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400';
    if (mimeType?.includes('word') || mimeType?.includes('document')) return 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
    if (mimeType?.includes('zip') || mimeType?.includes('rar')) return 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400';
    if (filename?.toLowerCase().includes('.csv')) return 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400';
    if (filename?.toLowerCase().includes('.txt')) return 'bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400';
    return 'bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Enhanced Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-8 mb-12"
        >
          <div className="flex items-center justify-center gap-4">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-lg">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Email Attachments
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">
                Smart document management
              </p>
            </div>
          </div>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
            All email attachments from your Gmail automatically extracted and organized. 
            PDFs, images, receipts, invoices, and more - all in one place.
          </p>

          {/* Data Source Indicator */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-5xl mx-auto mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Data Source: {hasDbData ? 'database' : hasCacheData ? 'cache-service' : hasBackgroundDocuments ? 'background-store' : 'api-swr'}
                </span>
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  ({documents.length} documents)
                </span>
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                {hasDbData ? '🗄️ Database Active' : hasCacheData ? '💾 Cache Service Active' : hasBackgroundDocuments ? '🔄 Background Sync Active' : '📊 API Data'}
              </div>
            </div>
          </div>

          {/* Compact Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Paperclip className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {filteredAndSortedDocuments.length}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Attachments</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Value</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    ₹{filteredAndSortedDocuments.length > 0 ? Math.round(totalAmount / filteredAndSortedDocuments.length).toLocaleString('en-IN') : '0'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Average</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {isLoading || isValidating ? '...' : error ? 'Error' : 'Cached'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    {isValidating ? 'Updating' : error ? 'Failed' : 'SWR Status'}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Compact Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm"
        >
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
              <Input
                placeholder="Search vendors, subjects, or file types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-4 py-2 h-12 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="date">Date</option>
                  <option value="amount">Amount</option>
                  <option value="vendor">Vendor</option>
                </select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-12 px-4 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-lg"
              >
                <SortAsc className="w-4 h-4 mr-2" />
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>

              <Button
                onClick={refreshDocuments}
                disabled={isLoading || isValidating}
                className="h-12 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm hover:shadow-lg transition-all duration-200 rounded-lg"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading || isValidating ? 'animate-spin' : ''}`} />
                {isLoading ? 'Loading...' : isValidating ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Compact Documents Grid */}
        {finalDocuments.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <AnimatePresence>
              {finalDocuments.map((doc: Document, index: number) => (
                <motion.div
                  key={doc.id}
                  variants={itemVariants}
                  layout
                  className="group"
                  whileHover={{ scale: 1.02, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="h-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg overflow-hidden group">
                    <CardHeader className="pb-3 px-4 pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                            <div className="text-sm text-white">{getVendorIcon(doc.vendor)}</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                              {doc.vendor}
                            </h3>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Badge variant="secondary" className={`text-xs px-1.5 py-0.5 rounded ${getFileTypeColor(doc.mimeType || '', doc.name || '')}`}>
                                {doc.type || 'Doc'}
                              </Badge>
                              {doc.isPdf && (
                                <Badge variant="destructive" className="text-xs px-1.5 py-0.5 rounded">
                                  PDF
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(doc.amount)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(doc.date)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-2 pt-0 px-4 pb-4">
                      {/* Email Subject - Compact */}
                      <div className="bg-gray-50 dark:bg-gray-700/30 rounded-md p-2">
                        <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-1 font-medium">
                          {doc.emailSubject || doc.subject}
                        </p>
                        {doc.emailFrom && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                            <Mail className="w-2.5 h-2.5" />
                            {doc.emailFrom.split('<')[0]?.trim()}
                          </p>
                        )}
                      </div>

                      {/* Attachment Details - Compact */}
                      <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-md">
                        <div className={`p-1.5 rounded ${getFileTypeColor(doc.mimeType || '', doc.name || '')}`}>
                          {getFileTypeIcon(doc.mimeType || '', doc.name || '')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                            {doc.name || 'attachment'}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            {doc.size && (
                              <span className="flex items-center gap-0.5">
                                <HardDrive className="w-2.5 h-2.5" />
                                {doc.size}
                              </span>
                            )}
                            {doc.mimeType && (
                              <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">
                                {doc.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons - Compact */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                            Verified
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDocument(doc)}
                            className="text-xs px-2 py-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-all duration-200"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          {/* Only show download button if document has attachment data */}
                          {(doc.attachmentId && doc.messageId) || (doc.geminiAnalysis?.pdfAttachments && doc.geminiAnalysis.pdfAttachments.length > 0) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedDocument(doc);
                                handleDownloadAttachment();
                              }}
                              className="text-xs px-2 py-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-all duration-200"
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center py-20"
          >
            <div className="w-32 h-32 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-sm">
              <FileText className="w-16 h-16 text-blue-600 dark:text-blue-400" />
            </div>
            
            <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              {isLoading || isValidating ? 'Loading Your Attachments...' : 'No Attachments Found'}
            </h3>
            
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              {isLoading || isValidating
                ? 'We\'re scanning your Gmail for email attachments...'
                : searchTerm
                ? 'No attachments match your search criteria. Try adjusting your search terms.'
                : error
                ? `Error loading attachments: ${error.message}. Try refreshing.`
                : 'We couldn\'t find any email attachments in your Gmail. Try refreshing or check your Gmail integration.'
              }
            </p>
            
            {!(isLoading || isValidating) && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={refreshDocuments}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm hover:shadow-lg transition-all duration-200 rounded-lg"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Scan Attachments
                </Button>
                
                {searchTerm && (
                  <Button
                    variant="outline"
                    onClick={() => setSearchTerm('')}
                    className="px-8 py-3 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-lg"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Enhanced View Document Modal */}
        <AnimatePresence>
          {isModalOpen && selectedDocument && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
              onClick={handleCloseModal}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.3 }}
                className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Enhanced Modal Header */}
                <div className="flex items-center justify-between p-8 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${getFileTypeColor(selectedDocument.mimeType || '', selectedDocument.name || '')}`}>
                      {getFileTypeIcon(selectedDocument.mimeType || '', selectedDocument.name || '')}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedDocument.name || 'Attachment'}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {selectedDocument.vendor} • {selectedDocument.size}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Only show download button if document has attachment data */}
                    {(selectedDocument.attachmentId && selectedDocument.messageId) || (selectedDocument.geminiAnalysis?.pdfAttachments && selectedDocument.geminiAnalysis.pdfAttachments.length > 0) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadAttachment}
                        className="px-4 py-2 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all duration-200"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    ) : null}
                    {/* Only show open button if document has attachment data */}
                    {(selectedDocument.attachmentId && selectedDocument.messageId) || (selectedDocument.geminiAnalysis?.pdfAttachments && selectedDocument.geminiAnalysis.pdfAttachments.length > 0) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenPdf}
                        className="px-4 py-2 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all duration-200"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCloseModal}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Email Content */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Mail className="w-5 h-5" />
                        Email Content
                      </h3>
                      
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Subject:</label>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">
                            {selectedDocument.emailSubject || selectedDocument.subject}
                          </p>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">From:</label>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">
                            {selectedDocument.emailFrom || selectedDocument.vendor}
                          </p>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Date:</label>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">
                            {formatDate(selectedDocument.emailDate || selectedDocument.date)}
                          </p>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Amount:</label>
                          <p className="text-sm text-gray-900 dark:text-white mt-1 font-semibold">
                            {formatCurrency(selectedDocument.amount)}
                          </p>
                        </div>
                      </div>

                      {/* Attachment Details */}
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                        <h4 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <Paperclip className="w-4 h-4" />
                          Attachment Details
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <label className="text-gray-600 dark:text-gray-400">File Type:</label>
                            <p className="text-gray-900 dark:text-white font-medium">
                              {selectedDocument.mimeType?.split('/')[1]?.toUpperCase() || 'Unknown'}
                            </p>
                          </div>
                          <div>
                            <label className="text-gray-600 dark:text-gray-400">Size:</label>
                            <p className="text-gray-900 dark:text-white font-medium">
                              {selectedDocument.size || 'Unknown'}
                            </p>
                          </div>
                          <div>
                            <label className="text-gray-600 dark:text-gray-400">Type:</label>
                            <p className="text-gray-900 dark:text-white font-medium">
                              {selectedDocument.type || 'Document'}
                            </p>
                          </div>
                          <div>
                            <label className="text-gray-600 dark:text-gray-400">Category:</label>
                            <p className="text-gray-900 dark:text-white font-medium">
                              {selectedDocument.category || 'General'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PDF Preview or File Info */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Maximize2 className="w-5 h-5" />
                        Preview
                      </h3>
                      
                      {selectedDocument.isPdf ? (
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-8 text-center">
                          <FileText className="w-16 h-16 text-red-500 mx-auto mb-4" />
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                            PDF Preview would be displayed here
                          </p>
                          {/* Only show open button if document has attachment data */}
                          {(selectedDocument.attachmentId && selectedDocument.messageId) || (selectedDocument.geminiAnalysis?.pdfAttachments && selectedDocument.geminiAnalysis.pdfAttachments.length > 0) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleOpenPdf}
                              className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Open PDF in New Tab
                            </Button>
                          ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              PDF attachment data not available
                            </div>
                          )}
                        </div>
                      ) : selectedDocument.mimeType?.includes('image') ? (
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-8 text-center">
                          <FileImage className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Image Preview would be displayed here
                          </p>
                          {/* Only show view button if document has attachment data */}
                          {(selectedDocument.attachmentId && selectedDocument.messageId) || (selectedDocument.geminiAnalysis?.pdfAttachments && selectedDocument.geminiAnalysis.pdfAttachments.length > 0) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleOpenPdf}
                              className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View Image
                            </Button>
                          ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Image attachment data not available
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-8 text-center">
                          <div className={`p-4 rounded-lg ${getFileTypeColor(selectedDocument.mimeType || '', selectedDocument.name || '')} inline-block mb-4`}>
                            {getFileTypeIcon(selectedDocument.mimeType || '', selectedDocument.name || '')}
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                            {selectedDocument.name || 'Attachment'}
                          </p>
                          {/* Only show download button if document has attachment data */}
                          {(selectedDocument.attachmentId && selectedDocument.messageId) || (selectedDocument.geminiAnalysis?.pdfAttachments && selectedDocument.geminiAnalysis.pdfAttachments.length > 0) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleDownloadAttachment}
                              className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download File
                            </Button>
                          ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              File attachment data not available
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}