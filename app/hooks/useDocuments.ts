import useSWR from 'swr';

// Shared SWR hook for documents across components
const fetchDocuments = async (url: string) => {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ FETCH ERROR - HTTP error! status:', response.status);
      
      if (response.status === 401) {
        throw new Error('Authentication required - Please log in again');
      } else {
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
    }

    const result = await response.json();
  
  // Handle backend-enhanced response format
  const documents = result.data?.purchases || result.documents || [];
  
  if (documents && documents.length > 0) {
    console.log('🔄 FETCH DEBUG - Found documents:', documents.length);

    const transformedDocuments = documents.map((doc: any) => ({
      id: doc.id || doc.messageId,
      vendor: doc.vendor,
      amount: doc.amount,
      date: doc.date,
      subject: doc.subject || doc.emailSubject,
      isInvoice: doc.isInvoice || true, // Backend processes invoices
      messageId: doc.messageId,
      name: doc.name || 'invoice.pdf',
      title: doc.title || doc.subject,
      type: doc.type || 'invoice',
      category: doc.category || 'Other',
      size: doc.size || 'Unknown',
      mimeType: doc.mimeType || 'application/pdf',
      emailSubject: doc.emailSubject || doc.subject,
      emailFrom: doc.emailFrom || doc.from,
      emailDate: doc.emailDate || doc.date,
      attachmentId: doc.attachmentId,
      isPdf: doc.isPdf || true,
      geminiAnalysis: doc.geminiAnalysis,
      // Backend-enhanced fields
      invoiceNumber: doc.invoiceNumber,
      documentType: doc.documentType,
      confidence: doc.confidence,
      invoiceData: doc.invoiceData,
      warrantyData: doc.warrantyData,
      refundData: doc.refundData,
      rawText: doc.rawText,
      emailContext: doc.emailContext
    }));
    
    // Also return summary data for dashboard
    const totalAmount = transformedDocuments.reduce((sum: number, doc: any) => {
      const amount = typeof doc.amount === 'string' 
        ? parseFloat(doc.amount.replace(/[₹,\s]/g, '') || '0')
        : (typeof doc.amount === 'number' ? doc.amount : 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    console.log('🔄 FETCH DEBUG - Returning transformed documents:', transformedDocuments.length);
    return {
      documents: transformedDocuments,
      summary: {
        totalAmount,
        totalDocuments: transformedDocuments.length,
        vendors: [...new Set(transformedDocuments.map((d: any) => d.vendor))].length
      }
    };
  }
  
  console.log('🔄 FETCH DEBUG - No documents found, returning empty array');
  return {
    documents: [],
    summary: { totalAmount: 0, totalDocuments: 0, vendors: 0 }
  };
  
  } catch (error) {
    console.error('❌ FETCH ERROR - Network or parsing error:', error);
    throw error;
  }
};

export const useDocuments = () => {
  // Use backend-enhanced endpoint for real invoice processing
  const url = '/api/invoices-backend-enhanced';
  
  return useSWR(
    url,
    fetchDocuments,
    {
      revalidateOnFocus: false, // Disable revalidation on focus to prevent refetching
      revalidateOnReconnect: false, // Disable revalidation on reconnect
      dedupingInterval: 300000, // 5 minutes deduping (increased)
      focusThrottleInterval: 300000, // 5 minutes focus throttle (increased)
      refreshInterval: 0, // No auto refresh - manual only
      errorRetryCount: 2, // Reduced retry count
      errorRetryInterval: 5000, // Increased retry interval
      // Add cache persistence
      keepPreviousData: true, // Keep previous data while revalidating
      onSuccess: (data) => {
        console.log('✅ SWR Success - Backend-enhanced documents loaded:', data?.documents?.length || 0);
      },
      onError: (error) => {
        console.error('❌ SWR Error - Failed to load backend-enhanced documents:', error);
      }
    }
  );
};
