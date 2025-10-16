import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getGmailClient } from '@/lib/gmail';
import { supabaseSyncService } from '@/lib/supabase-sync';

const PDF_PARSER_BACKEND_URL = process.env.PDF_PARSER_BACKEND_URL || 'http://localhost:8000';

// Helper function to check if email is a credit card statement
function isCreditCardStatement(subject: string, from: string, body: string = ''): boolean {
  const subjectLower = subject.toLowerCase();
  const fromLower = from.toLowerCase();
  const bodyLower = body.toLowerCase();
  
  // Check for credit card statement keywords
  const creditCardKeywords = [
    'credit card statement',
    'card statement',
    'credit card',
    'statement',
    'bank statement',
    'upi rupay',
    'hdfc bank',
    'icici bank',
    'sbi card',
    'axis bank',
    'kotak bank',
    'credit card bill',
    'card bill'
  ];
  
  // Check subject and from fields
  for (const keyword of creditCardKeywords) {
    if (subjectLower.includes(keyword) || fromLower.includes(keyword)) {
      return true;
    }
  }
  
  // Check for bank domains
  const bankDomains = ['hdfcbank.com', 'icicibank.com', 'sbicard.com', 'axisbank.com', 'kotak.com'];
  for (const domain of bankDomains) {
    if (fromLower.includes(domain)) {
      return true;
    }
  }
  
  return false;
}

// Helper function to process emails with backend
async function processWithBackend(gmail: unknown, messageId: string, emailContext: { subject: string; from: string; body: string; date: string }) {
  try {
    console.log(`🔍 Processing message ${messageId} with backend...`);

    // Check if this is a credit card statement
    if (isCreditCardStatement(emailContext.subject, emailContext.from, emailContext.body)) {
      console.log(`🚫 Skipping credit card statement: ${emailContext.subject}`);
      return {
        success: true,
        data: {
          vendor: emailContext.from,
          amount: 0,
          date: emailContext.date,
          document_type: 'credit_card_statement',
          confidence: 0.0,
          skipped: true,
          reason: 'Credit card statement excluded from processing'
        }
      };
    }

    // Get full message with attachments
    const messageResponse = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    const message = messageResponse.data;
    const pdfAttachments = await extractPdfAttachments(gmail, messageId, message.payload);

    console.log(`📄 Found ${pdfAttachments.length} PDF attachments`);
    console.log(`📄 PDF Attachments:`, pdfAttachments.map(att => ({ filename: att.filename, size: att.size })));

    if (pdfAttachments.length === 0) {
      console.log('⚠️ No PDF attachments found, returning basic data');
      return {
        success: true,
        data: {
          vendor: emailContext.from,
          amount: 0,
          date: emailContext.date,
          document_type: 'email',
          confidence: 0.3
        }
      };
    }

    // Send to backend
    const emailData = {
      messageId,
      subject: emailContext.subject,
      from: emailContext.from,
      date: emailContext.date,
      body: emailContext.body,
      pdfAttachments: pdfAttachments
    };

    console.log(`🚀 Sending to backend: ${PDF_PARSER_BACKEND_URL}/process-email-data`);
    console.log(`🔗 Backend URL: ${PDF_PARSER_BACKEND_URL}`);

    const response = await fetch(`${PDF_PARSER_BACKEND_URL}/process-email-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_data: emailData,
        process_all_attachments: true
      }),
      // Add timeout
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Backend error: ${response.status} - ${errorText}`);
      throw new Error(`Backend responded with status: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ Backend processing successful:`, result);
    console.log(`💰 Backend returned amount:`, result.data?.amount, 'type:', typeof result.data?.amount);
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ Backend processing error:', error);

    // Return fallback data instead of failing completely
    return {
      success: false,
      error: errorMessage,
      fallback: true,
      data: {
        vendor: emailContext.from,
        amount: 0,
        date: emailContext.date,
        document_type: 'email',
        confidence: 0.2
      }
    };
  }
}

// Helper function to extract PDF attachments
async function extractPdfAttachments(gmail: unknown, messageId: string, payload: { mimeType?: string; filename?: string; body?: { attachmentId?: string }; parts?: unknown[] }): Promise<Array<{ filename: string; attachmentId: string; mimeType: string; data: string } | null>> {
  const attachments: Array<{ filename: string; attachmentId: string }> = [];
  
  if (!payload) return [];
  
  const processPart = (part: { mimeType?: string; filename?: string; body?: { attachmentId?: string }; parts?: unknown[] }) => {
    if (part.mimeType === 'application/pdf' && part.filename && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename,
        attachmentId: part.body.attachmentId
      });
    }
    
    if (part.parts) {
      part.parts.forEach(processPart);
    }
  };
  
  processPart(payload);
  
  // Download attachment data
  const attachmentPromises = attachments.map(async (attachment) => {
    try {
      const attachmentResponse = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: messageId,
        id: attachment.attachmentId
      });
      
      const data = attachmentResponse.data.data;
      if (data) {
        return {
          filename: attachment.filename,
          attachmentId: attachment.attachmentId,
          mimeType: 'application/pdf',
          data: data
        };
      }
    } catch (error) {
      console.error(`Error downloading attachment ${attachment.filename}:`, error);
    }
    return null;
  });
  
  const results = await Promise.all(attachmentPromises);
  return results.filter(Boolean);
}

// Smart email fetching with Supabase caching - Gmail first, then cache
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '90'); // Default to 3 months for background processing
    const maxResults = parseInt(searchParams.get('maxResults') || '200'); // Increased for 3-month data
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    console.log(`🚀 Starting smart email fetch for ${days} days with ${maxResults} max results (forceRefresh: ${forceRefresh})`);

    // Try to get cached data first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = await supabaseSyncService.getCachedData(session.user.email, days);
      if (cachedData) {
        console.log('✅ Using cached data from Supabase');
        return NextResponse.json({
          success: true,
          data: cachedData,
          summary: {
            totalEmails: cachedData.purchases.length + cachedData.refundOpportunities.length + cachedData.warranties.length,
            totalAmount: cachedData.totalSpent,
            processingTime: Date.now(),
            purchasesFound: cachedData.purchases.length,
            refundsFound: cachedData.refundOpportunities.length,
            warrantiesFound: cachedData.warranties.length,
            documentsFound: cachedData.documents.total,
            source: 'supabase-cached'
          }
        });
      }
    }

    console.log('📧 Cached data not available or stale, fetching fresh Gmail data with BACKEND ENHANCED processing...');

    // Set background progress to active
    try {
      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/background-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: true,
          progress: 0,
          message: 'Starting 3-month data sync...',
          status: 'syncing',
          documentsFound: 0
        })
      });
    } catch (error) {
      console.log('Could not update progress status:', error);
    }

    // Process emails directly with backend integration (no internal API call needed)
    const gmail = await getGmailClient();
    
    // Enhanced query for better invoice detection - EXCLUDING credit card statements
    const query = `in:inbox newer_than:${days}d (invoice OR receipt OR bill OR payment OR order OR booking OR ticket OR confirmation OR "thank you for your order" OR "order confirmation" OR "payment receipt" OR "booking confirmation" OR "ticket confirmation" OR "delivery confirmation" OR "purchase confirmation") -from:facebook.com -from:myntra.com -from:zomato.com -from:naukri.com -from:microsoft.com -subject:"notification" -subject:"commented" -subject:"posted" -subject:"shared" -subject:"sale" -subject:"offer" -subject:"promotion" -subject:"credit card" -subject:"statement" -subject:"bank" -subject:"card statement" -subject:"credit card statement" -from:*bank* -from:*card* -from:*credit*`;
    
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: maxResults,
    });
    
    const messages = listRes.data.messages || [];
    console.log(`📧 Found ${messages.length} emails to process with backend`);
    
    if (!messages.length) {
      return NextResponse.json({
        success: true,
        data: { purchases: [], totalSpent: 0, purchaseCount: 0 },
        summary: { totalInvoices: 0, totalAmount: 0 },
        timestamp: new Date().toISOString()
      });
    }

    const invoices: Array<{
      id: string;
      vendor: string;
      amount: number;
      date: string;
      subject: string;
      from: string;
      invoiceNumber?: string;
      documentType: string;
      confidence: number;
      invoiceData?: unknown;
      warrantyData?: unknown;
      refundData?: unknown;
      rawText?: string;
      emailContext?: unknown;
    }> = [];
    let processed = 0;
    let backendProcessed = 0;
    
    // Update progress - processing emails
    try {
      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/background-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: true,
          progress: 30,
          message: `Processing ${messages.length} emails from 3 months...`,
          status: 'syncing',
          documentsFound: 0
        })
      });
    } catch (error) {
      console.log('Could not update progress status:', error);
    }

    // Process emails with backend integration
    const concurrency = 3; // Reduced for backend processing
    let index = 0;
    
    while (index < messages.length) {
      const batch = messages.slice(index, index + concurrency);
      
      const batchPromises = batch.map(async (message) => {
        try {
          const messageId = message.id!;
          console.log(`🔍 Processing message ${messageId} with backend...`);
          
          // Get basic message info first
          const messageRes = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date']
          });
          
          const headers = messageRes.data.payload?.headers || [];
          const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
          const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
          const date = headers.find(h => h.name === 'Date')?.value || new Date().toISOString();
          
          // Process with backend
          const backendResult = await processWithBackend(gmail, messageId, {
            from,
            subject,
            date,
            body: 'Email content...' // We'll get this from backend
          });
          
          if (backendResult.success && backendResult.data) {
            const invoice = backendResult.data;
            invoices.push({
              id: messageId,
              vendor: invoice.vendor,
              amount: invoice.amount,
              date: invoice.date,
              subject: subject,
              from: from,
              invoiceNumber: invoice.invoice_number,
              documentType: invoice.document_type,
              confidence: invoice.confidence,
              invoiceData: invoice.invoice_data,
              warrantyData: invoice.warranty_data,
              refundData: invoice.refund_data,
              rawText: invoice.raw_text,
              emailContext: invoice.email_context
            });
            backendProcessed++;
            console.log(`✅ Backend processed: ${invoice.vendor} - ₹${invoice.amount}`);
          } else {
            console.log(`⚠️ Backend processing failed for ${messageId}: ${backendResult.error}`);
          }
          
          processed++;
        } catch (error) {
          console.error(`❌ Error processing message ${message.id}:`, error);
          processed++;
        }
      });
      
      await Promise.all(batchPromises);
      index += concurrency;
    }
    
    console.log(`🎯 Backend processing complete: ${backendProcessed}/${processed} emails processed successfully`);
    
    const backendData = {
      success: true,
      data: { purchases: invoices }
    };
    
    // Transform backend data to match expected format
    const purchases: Array<{
      id: string;
      vendor: string;
      amount: number | string;
      date: string;
      subject: string;
      from: string;
      invoiceNumber?: string;
      documentType: string;
      confidence: number;
      invoiceData?: unknown;
      warrantyData?: unknown;
      refundData?: unknown;
      rawText?: string;
      emailContext?: unknown;
      category?: string;
    }> = backendData.data.purchases || [];
    const refunds: Array<{ status: string; amount: string }> = []; // Will be extracted from backend data if available
    const warranties: Array<{ status: string }> = []; // Will be extracted from backend data if available
    const documents: Array<{
      id: string;
      vendor: string;
      amount: number;
      date: string;
      subject: string;
      from: string;
      invoiceNumber?: string;
      documentType: string;
      confidence: number;
      invoiceData?: unknown;
      warrantyData?: unknown;
      refundData?: unknown;
      rawText?: string;
      emailContext?: unknown;
    }> = invoices; // Use the invoices as documents

    // Calculate totals - include all purchases, even with zero amounts initially
    const totalSpent = purchases.reduce((sum: number, purchase) => {
      const amount = typeof purchase.amount === 'number' ? purchase.amount : parseFloat(String(purchase.amount).replace(/[₹,]/g, '') || '0') || 0;
      return sum + amount;
    }, 0);

    const purchaseCount = purchases.length;
    const activeWarranties = warranties.filter(w => w.status === 'active').length;
    const refundableAmount = refunds
      .filter((r) => r.status === 'eligible')
      .reduce((sum: number, r) => {
        const amount = parseFloat(r.amount.replace(/[₹,]/g, '')) || 0;
        return sum + amount;
      }, 0);

    // Calculate monthly spending
    const monthlySpending = purchases.reduce((sum: number, purchase) => {
      const purchaseDate = new Date(purchase.date);
      const now = new Date();
      const isThisMonth = purchaseDate.getMonth() === now.getMonth() && 
                         purchaseDate.getFullYear() === now.getFullYear();
      
      if (isThisMonth) {
        const amount = typeof purchase.amount === 'number' ? purchase.amount : parseFloat(String(purchase.amount).replace(/[₹,]/g, '') || '0') || 0;
        return sum + amount;
      }
      return sum;
    }, 0);

    // Calculate categories
    const categories = purchases.reduce((acc: Record<string, number>, purchase) => {
      const category = purchase.category || 'Other';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const gmailData = {
      totalSpent,
      purchaseCount,
      activeWarranties,
      purchases: purchases.slice(0, 20), // Limit for performance
      refundOpportunities: refunds.slice(0, 10),
      warranties: warranties.slice(0, 10),
      documents: {
        total: documents.length,
        receipts: documents.filter(d => d.documentType === 'receipt').length,
        invoices: documents.filter(d => d.documentType === 'invoice').length,
      },
      documentsArray: documents, // Include full documents array for frontend
      refundable: {
        amount: refundableAmount,
        percentage: refundableAmount > 0 ? 15 : 0,
      },
      monthlySpending,
      categories,
      hasInitialData: purchases.length > 0,
      source: 'direct-gmail',
      fetchedAt: new Date().toISOString(),
      loading: false,
    };

    // Store in Supabase for future caching
    console.log('💾 Storing Gmail data in Supabase for caching...');
    const syncSuccess = await supabaseSyncService.storeGmailData(session.user.email, gmailData);
    
    if (syncSuccess) {
      console.log('✅ Data successfully stored in Supabase');
    } else {
      console.log('⚠️ Failed to store data in Supabase, but continuing with Gmail data');
    }

    // Update progress - completed
    try {
      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/background-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: false,
          progress: 100,
          message: `Completed - ${documents.length} documents processed`,
          status: 'success',
          documentsFound: documents.length
        })
      });
    } catch (error) {
      console.log('Could not update progress status:', error);
    }

    console.log('📊 FINAL API RESPONSE:', {
      totalSpent,
      purchaseCount: purchases.length,
      documentsCount: documents.length,
      documentsType: typeof documents,
      isDocumentsArray: Array.isArray(documents),
      firstDocument: documents[0] ? {
        id: documents[0].id,
        vendor: documents[0].vendor,
        amount: documents[0].amount,
        type: documents[0].documentType
      } : 'No documents'
    });

    const result = {
      success: true,
      data: gmailData,
      summary: {
        totalEmails: purchases.length + refunds.length + warranties.length,
        totalAmount: totalSpent,
        processingTime: Date.now(),
        purchasesFound: purchases.length,
        refundsFound: refunds.length,
        warrantiesFound: warranties.length,
        documentsFound: documents.length,
        source: 'backend-enhanced-gmail',
        supabaseSync: syncSuccess,
        backendProcessed: true
      }
    };

    console.log(`✅ Smart email fetch completed: ${purchases.length} purchases, ${refunds.length} refunds, ${warranties.length} warranties`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Direct email fetch error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch email data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

