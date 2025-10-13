import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getGmailClient } from '@/lib/gmail';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🚀 Starting OPTIMIZED invoice extraction...');
    
    const gmail = await getGmailClient();
    const days = 7;
    const afterDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // OPTIMIZED: More specific query with better filtering
    const query = `in:inbox newer_than:${days}d (invoice OR receipt OR bill OR payment OR order OR booking OR ticket OR confirmation OR "thank you for your order" OR "order confirmation" OR "payment receipt" OR "booking confirmation" OR "ticket confirmation" OR "delivery confirmation" OR "purchase confirmation") -from:facebook.com -from:myntra.com -from:zomato.com -from:naukri.com -from:microsoft.com -subject:"notification" -subject:"commented" -subject:"posted" -subject:"shared" -subject:"sale" -subject:"offer" -subject:"promotion"`;
    
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 100, // Increased for more data
    });
    
    const messages = listRes.data.messages || [];
    console.log(`📧 Found ${messages.length} emails to process`);
    
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
    
    // OPTIMIZATION: Process all emails with high concurrency
    const concurrency = 10; // Increased concurrency
    let index = 0;
    
    async function worker() {
      while (index < messages.length) {
        const current = index++;
        const message = messages[current];
        if (!message?.id) continue;
        
        try {
          console.log(`⚡ Processing ${current + 1}/${messages.length}: ${message.id}`);
          
          // OPTIMIZATION: Get metadata first for quick filtering
          const metaRes = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'metadata',
            metadataHeaders: ['Subject', 'From', 'Date'],
          });
          
          const { subject, from, date } = parseHeaders(metaRes.data);
          const emailDate = new Date(date);
          
          // Skip old emails
          if (emailDate < afterDate) {
            console.log(`📅 Skipping old email: ${subject}`);
            continue;
          }
          
          // Quick subject filtering
          const subjectLower = subject.toLowerCase();
          const isLikelyInvoice = subjectLower.includes('invoice') || 
                                subjectLower.includes('receipt') || 
                                subjectLower.includes('payment') ||
                                subjectLower.includes('booking') ||
                                subjectLower.includes('ticket') ||
                                subjectLower.includes('confirmation') ||
                                subjectLower.includes('order') ||
                                subjectLower.includes('delivery');
          
          if (!isLikelyInvoice) {
            console.log(`📄 Skipping non-invoice: ${subject}`);
            continue;
          }
          
          // Get full content only for likely invoices
          const fullRes = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full',
          });
          
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
          
          // Extract amount and vendor
          const amount = extractAmount(fullText);
          const vendor = cleanVendor(from);
          
          // Check for attachments
          const attachments = fullRes.data.payload?.parts?.filter(part => 
            part.filename && part.filename.toLowerCase().includes('.pdf')
          ) || [];
          
          const invoice = {
            id: message.id,
            vendor,
            amount,
            date,
            subject,
            isInvoice: true,
            hasAttachment: attachments.length > 0,
            attachmentCount: attachments.length,
            attachmentDetails: attachments[0] ? {
              filename: attachments[0].filename,
              mimeType: attachments[0].mimeType,
              size: attachments[0].body?.size,
              attachmentId: attachments[0].body?.attachmentId
            } : null,
            confidence: 0.9,
            source: attachments.length > 0 ? 'gmail-pdf-attachment' : 'gmail-text-invoice'
          };
          
          invoices.push(invoice);
          processed++;
          
          console.log(`✅ Invoice found: ${vendor} - ₹${amount} (${attachments.length > 0 ? 'with attachments' : 'text only'})`);
          
        } catch (error) {
          console.error(`❌ Error processing ${message.id}:`, error);
        }
      }
    }
    
    // Start multiple workers for parallel processing
    const workers = Array.from({ length: Math.min(concurrency, messages.length) }, () => worker());
    await Promise.all(workers);
    
    console.log(`⚡ Processing completed: ${invoices.length} invoices found from ${processed} processed emails`);
    
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    
    return NextResponse.json({
      success: true,
      data: {
        purchases: invoices,
        totalSpent: totalAmount,
        purchaseCount: invoices.length,
        documents: {
          total: invoices.length,
          invoices: invoices.length,
          withAttachments: invoices.filter(inv => inv.hasAttachment).length
        },
        refundOpportunities: [],
        warranties: [],
        hasInitialData: true,
        source: 'gmail-optimized-extraction',
        message: `Optimized extraction: ${invoices.length} invoices (₹${totalAmount} total) from ${processed} processed emails`
      },
      summary: {
        totalInvoices: invoices.length,
        totalAmount,
        withAttachments: invoices.filter(inv => inv.hasAttachment).length,
        vendors: [...new Set(invoices.map(inv => inv.vendor))],
        dateRange: {
          from: afterDate.toISOString(),
          to: new Date().toISOString()
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Optimized extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract invoices', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}

// Helper functions
function parseHeaders(data: any) {
  const headers = data.payload?.headers || [];
  const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
  const from = headers.find((h: any) => h.name === 'From')?.value || '';
  const date = headers.find((h: any) => h.name === 'Date')?.value || '';
  return { subject, from, date };
}

function getEmailBody(data: any): string {
  if (data.payload?.body?.data) {
    return Buffer.from(data.payload.body.data, 'base64').toString();
  }
  
  if (data.payload?.parts) {
    for (const part of data.payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString();
      }
    }
  }
  
  return '';
}

function extractAmount(text: string): number {
  const amountRegex = /(?:₹|Rs\.?|INR)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
  const match = text.match(amountRegex);
  return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
}

function cleanVendor(from: string): string {
  let vendor = from.split('<')[0].trim();
  if (vendor.includes('"')) {
    vendor = vendor.replace(/"/g, '').trim();
  }
  return vendor;
}