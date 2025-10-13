import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getGmailClient } from '@/lib/gmail';

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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🚀 Starting ENHANCED invoice extraction with Python backend...');
    
    const gmail = await getGmailClient();
    const days = 7;
    const afterDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Enhanced query for better invoice detection - EXCLUDING credit card statements
    const query = `in:inbox newer_than:${days}d (invoice OR receipt OR bill OR payment OR order OR booking OR ticket OR confirmation OR "thank you for your order" OR "order confirmation" OR "payment receipt" OR "booking confirmation" OR "ticket confirmation" OR "delivery confirmation" OR "purchase confirmation") -from:facebook.com -from:myntra.com -from:zomato.com -from:naukri.com -from:microsoft.com -subject:"notification" -subject:"commented" -subject:"posted" -subject:"shared" -subject:"sale" -subject:"offer" -subject:"promotion" -subject:"credit card" -subject:"statement" -subject:"bank" -subject:"card statement" -subject:"credit card statement" -from:*bank* -from:*card* -from:*credit*`;
    
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 50, // Process more emails for better data
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

    const invoices: any[] = [];
    let processed = 0;
    let backendProcessed = 0;
    
    // Process emails with backend integration
    const concurrency = 5; // Reduced for backend processing
    let index = 0;
    
    async function worker() {
      while (index < messages.length) {
        const current = index++;
        const message = messages[current];
        
        try {
          // Get full message details
          const fullRes = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          });
          
          const headers = fullRes.data.payload?.headers || [];
          const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
          const from = headers.find((h: any) => h.name === 'From')?.value || '';
          const date = headers.find((h: any) => h.name === 'Date')?.value || '';
          
          // Check if this is a credit card statement and skip it
          if (isCreditCardStatement(subject, from)) {
            console.log(`🚫 Skipping credit card statement: ${subject}`);
            continue;
          }
          
          const emailBody = getEmailBody(fullRes.data);
          const fullText = `${subject} ${emailBody}`.toLowerCase();
          
          // Skip junk emails
          if (fullText.includes('facebook') || 
              fullText.includes('notification') ||
              fullText.includes('commented') ||
              fullText.includes('posted') ||
              fullText.includes('shared')) {
            console.log(`🚫 Skipping junk email: ${subject}`);
            continue;
          }
          
          // Check for PDF attachments
          const attachments = fullRes.data.payload?.parts?.filter(part => 
            part.filename && part.filename.toLowerCase().includes('.pdf')
          ) || [];
          
          if (attachments.length > 0) {
            console.log(`📄 Found PDF attachment in: ${subject}`);
            
            try {
              // Process with Python backend
              const backendResult = await processWithBackend(gmail, message.id, {
                subject,
                from,
                date,
                body: emailBody
              });
              
              if (backendResult.success && backendResult.data) {
                const invoice = {
                  id: message.id,
                  messageId: message.id,
                  vendor: backendResult.data.vendor || cleanVendor(from),
                  amount: backendResult.data.amount || 0,
                  date: backendResult.data.date || date,
                  subject,
                  from,
                  isInvoice: true,
                  hasAttachment: true,
                  attachmentCount: attachments.length,
                  confidence: backendResult.data.confidence || 0.9,
                  source: backendResult.fallback ? 'fallback-basic-parsing' : 'backend-pdf-parser',
                  
                  // Enhanced data from backend
                  invoiceNumber: backendResult.data.invoice_number,
                  documentType: backendResult.data.document_type,
                  
                  // Invoice specific data
                  invoiceData: backendResult.data.invoice_data ? {
                    products: backendResult.data.invoice_data.products || [],
                    taxAmount: backendResult.data.invoice_data.tax_amount || 0,
                    paymentMethod: backendResult.data.invoice_data.payment_method,
                    shippingCost: backendResult.data.invoice_data.shipping_cost || 0,
                    discount: backendResult.data.invoice_data.discount || 0,
                    totalAmount: backendResult.data.amount || 0
                  } : null,

                  // Warranty specific data
                  warrantyData: backendResult.data.warranty_data ? {
                    productName: backendResult.data.warranty_data.product_name,
                    warrantyPeriod: backendResult.data.warranty_data.warranty_period,
                    warrantyStatus: backendResult.data.warranty_data.warranty_status,
                    warrantyTerms: backendResult.data.warranty_data.warranty_terms
                  } : null,

                  // Refund specific data
                  refundData: backendResult.data.refund_data ? {
                    refundAmount: backendResult.data.refund_data.refund_amount,
                    refundReason: backendResult.data.refund_data.refund_reason,
                    refundStatus: backendResult.data.refund_data.refund_status,
                    refundMethod: backendResult.data.refund_data.refund_method
                  } : null,

                  // Raw extracted text
                  rawText: backendResult.data.raw_text || '',
                  
                  // Metadata
                  metadata: {
                    filename: backendResult.data.filename,
                    processingTime: Date.now(),
                    backendProcessed: true
                  }
                };
                
                invoices.push(invoice);
                backendProcessed++;
                console.log(`✅ Backend processed: ${backendResult.data.vendor} - ₹${backendResult.data.amount}`);
              } else {
                console.log(`⚠️ Backend processing failed for ${subject}: ${backendResult.error}`);
                
                // Fallback to basic extraction
                const amount = extractAmount(fullText);
                const vendor = cleanVendor(from);
                
                const invoice = {
                  id: message.id,
                  vendor,
                  amount,
                  date,
                  subject,
                  isInvoice: true,
                  hasAttachment: true,
                  attachmentCount: attachments.length,
                  confidence: 0.6,
                  source: 'fallback-basic-parsing',
                  backendError: backendResult.error
                };
                
                invoices.push(invoice);
                console.log(`📝 Fallback processed: ${vendor} - ₹${amount}`);
              }
              
            } catch (backendError) {
              console.error(`❌ Backend error for ${subject}:`, backendError);
              
              // Fallback to basic extraction
              const amount = extractAmount(fullText);
              const vendor = cleanVendor(from);
              
              const invoice = {
                id: message.id,
                vendor,
                amount,
                date,
                subject,
                isInvoice: true,
                hasAttachment: true,
                attachmentCount: attachments.length,
                confidence: 0.5,
                source: 'fallback-basic-parsing'
              };
              
              invoices.push(invoice);
            }
          } else {
            // No PDF attachment - use basic text extraction
            const amount = extractAmount(fullText);
            const vendor = cleanVendor(from);
            
            const invoice = {
              id: message.id,
              vendor,
              amount,
              date,
              subject,
              isInvoice: true,
              hasAttachment: false,
              attachmentCount: 0,
              confidence: 0.4,
              source: 'text-only-parsing'
            };
            
            invoices.push(invoice);
            console.log(`📝 Text-only processed: ${vendor} - ₹${amount}`);
          }
          
          processed++;
          
        } catch (error) {
          console.error(`❌ Error processing ${message.id}:`, error);
        }
      }
    }
    
    // Start workers for parallel processing
    const workers = Array.from({ length: Math.min(concurrency, messages.length) }, () => worker());
    await Promise.all(workers);
    
    const totalSpent = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    
    console.log(`🎉 Processing complete! Processed: ${processed}, Backend processed: ${backendProcessed}, Total: ₹${totalSpent}`);
    
    return NextResponse.json({
      success: true,
      data: {
        purchases: invoices,
        totalSpent,
        purchaseCount: invoices.length
      },
      summary: {
        totalInvoices: invoices.length,
        totalAmount: totalSpent,
        backendProcessed,
        fallbackProcessed: processed - backendProcessed
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error in invoices-backend-enhanced:', error);
    return NextResponse.json(
      { error: 'Failed to process invoices', details: error.message },
      { status: 500 }
    );
  }
}

async function processWithBackend(gmail: any, messageId: string, emailContext: any) {
  try {
    console.log(`🔍 Processing message ${messageId} with backend...`);
    
    // Get full message with attachments
    const messageResponse = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    const message = messageResponse.data;
    const pdfAttachments = await extractPdfAttachments(gmail, messageId, message.payload);

    console.log(`📄 Found ${pdfAttachments.length} PDF attachments`);

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
    return result;
  } catch (error: any) {
    console.error('❌ Backend processing error:', error);
    
    // Return fallback data instead of failing completely
    return { 
      success: false, 
      error: error.message,
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

async function extractPdfAttachments(gmail: any, messageId: string, payload: any): Promise<Array<{
  attachmentId: string;
  filename: string;
  mimeType: string;
  data: string;
}>> {
  const pdfAttachments = [];

  if (!payload.parts) return pdfAttachments;

  for (const part of payload.parts) {
    console.log(`🔍 Checking part: filename="${part.filename}", mimeType="${part.mimeType}"`);
    
    if ((part.filename && part.filename.toLowerCase().endsWith('.pdf')) || 
        part.mimeType === 'application/pdf') {
      console.log(`✅ Found PDF attachment: ${part.filename || 'unknown.pdf'} (${part.mimeType})`);
      
      try {
        // Download the attachment
        const attachmentResponse = await gmail.users.messages.attachments.get({
          userId: 'me',
          messageId: messageId,
          id: part.body.attachmentId
        });

        if (attachmentResponse.data.data) {
          pdfAttachments.push({
            attachmentId: part.body.attachmentId,
            filename: part.filename || 'unknown.pdf',
            mimeType: part.mimeType,
            data: attachmentResponse.data.data
          });
          console.log(`📎 Successfully downloaded PDF: ${part.filename || 'unknown.pdf'}`);
        } else {
          console.log(`⚠️ No data found for PDF: ${part.filename || 'unknown.pdf'}`);
        }
      } catch (error) {
        console.error(`❌ Error downloading PDF attachment ${part.filename}:`, error);
      }
    } else {
      console.log(`⏭️ Skipping non-PDF: ${part.filename || 'no-filename'} (${part.mimeType})`);
    }

    // Check nested parts
    if (part.parts) {
      const nestedPdfs = await extractPdfAttachments(gmail, messageId, part);
      pdfAttachments.push(...nestedPdfs);
    }
  }

  return pdfAttachments;
}

function getEmailBody(message: any): string {
  if (!message.payload) return '';

  if (message.payload.body?.data) {
    return Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
  }

  if (message.payload.parts) {
    for (const part of message.payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.mimeType === 'text/html' && part.body?.data) {
        const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }
  }

  return '';
}

function extractAmount(text: string): number {
  const amountPatterns = [
    /₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
    /Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
    /INR\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
    /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*rupees?/g,
    /Amount[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
    /Total[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
    /Paid[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
  ];

  const amounts: number[] = [];

  for (const pattern of amountPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        const amountStr = match.replace(/[₹,Rs\.\s]/g, '');
        const amount = parseFloat(amountStr);
        if (!isNaN(amount) && amount > 0) {
          amounts.push(amount);
        }
      }
    }
  }

  return amounts.length > 0 ? Math.max(...amounts) : 0;
}

function cleanVendor(from: string): string {
  // Extract vendor name from email address
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return match[1].trim();
  }
  
  // Extract from email domain
  const emailMatch = from.match(/@(.+?)\./);
  if (emailMatch) {
    return emailMatch[1].split('.').map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ');
  }
  
  return from.split('@')[0] || 'Unknown Vendor';
}

