'use client';

import { useEffect } from 'react';
import { useDataStore } from '@/app/stores/dataStore';
import { cacheService } from '@/app/lib/cacheService';
import { dataSyncService } from '@/app/lib/dataSyncService';
import { databaseSyncService } from '@/app/lib/databaseSyncService';
import { mutate } from 'swr';

export const useBackgroundData = () => {
  const { updateDocumentsRealtime, addBackgroundDocuments } = useDataStore();

  const handleBackgroundJobComplete = (results: any[]) => {
    console.log('🎉 Background job completed with results:', results?.length || 0);
    
    // Validate results is an array
    if (!Array.isArray(results)) {
      console.error('❌ handleBackgroundJobComplete: results is not an array:', results);
      return;
    }
    
    // Transform results to match document format
    const transformedDocuments = results.map((doc: any) => ({
      id: doc.messageId || doc.id,
      vendor: doc.vendor || 'Unknown Vendor',
      amount: typeof doc.amount === 'number' ? `₹${doc.amount}` : doc.amount || '₹0',
      date: doc.date || new Date().toISOString(),
      subject: doc.subject || doc.emailSubject || 'Document',
      isInvoice: doc.isInvoice || true,
      messageId: doc.messageId,
      name: doc.attachmentFilename || doc.filename || 'document.pdf',
      title: doc.title || doc.subject,
      type: doc.type || 'invoice',
      category: doc.category || 'Other',
      size: doc.attachmentSize ? `${Math.round(doc.attachmentSize / 1024)}KB` : 'Unknown',
      mimeType: doc.attachmentMimeType || 'application/pdf',
      emailSubject: doc.emailSubject || doc.subject,
      emailFrom: doc.emailFrom || doc.from,
      emailDate: doc.emailDate || doc.date,
      attachmentId: doc.attachmentId,
      isPdf: doc.isPdf || true,
      // Backend-enhanced fields
      invoiceNumber: doc.invoiceNumber,
      documentType: doc.documentType,
      confidence: doc.confidence,
      invoiceData: doc.invoiceData,
      warrantyData: doc.warrantyData,
      refundData: doc.refundData,
      rawText: doc.rawText,
      emailContext: doc.emailContext
    })).filter(doc => {
      // Include all documents initially, even with zero amounts
      // The backend processing will update amounts correctly
      return true;
    });

    console.log('🔄 Processing background documents:', {
      originalCount: results.length,
      transformedCount: transformedDocuments.length,
      firstDocument: transformedDocuments[0]
    });

    // Add to data store (this will trigger re-renders)
    addBackgroundDocuments(transformedDocuments);
    
    // Update realtime documents
    updateDocumentsRealtime(transformedDocuments);
    
    // Update cache service for persistence across route changes
    cacheService.addDocuments(transformedDocuments);

    // Notify all pages of background data update
    dataSyncService.updateDocuments(transformedDocuments, 'background-processing');

    // Save to database for persistence
    databaseSyncService.saveDocumentsToDatabase(transformedDocuments);
    
    // Update SWR cache to trigger useDocuments hook re-render
    mutate('/api/invoices-backend-enhanced');
    
    // Force a re-render by updating the store's lastSyncTime and hasInitialData
    useDataStore.setState({ 
      lastSyncTime: new Date().toISOString(),
      hasInitialData: true
    });
    
    // Force a page refresh to ensure UI updates
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('backgroundDataUpdated', { 
          detail: { count: transformedDocuments.length } 
        }));
      }
    }, 100);
    
    console.log(`✅ Added ${transformedDocuments.length} background documents to store and updated SWR cache`);
  };

  return {
    handleBackgroundJobComplete
  };
};
