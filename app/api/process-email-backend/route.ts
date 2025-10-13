import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getGmailClient } from '@/lib/gmail';

const PDF_PARSER_BACKEND_URL = process.env.PDF_PARSER_BACKEND_URL || 'http://localhost:8000';

interface EmailData {
  messageId: string;
  subject: string;
  from: string;
  date: string;
  body: string;
  pdfAttachments: Array<{
    attachmentId: string;
    filename: string;
    mimeType: string;
    data: string; // base64 encoded PDF data
  }>;
}

interface BackendResponse {
  success: boolean;
  data?: {
    document_type: string;
    filename: string;
    vendor: string;
    amount: number;
    date: string;
    invoice_number?: string;
    invoice_data?: {
      products: Array<{
        name: string;
        quantity: number;
        price: number;
      }>;
      tax_amount: number;
      payment_method?: string;
      shipping_cost: number;
      discount: number;
    };
    warranty_data?: {
      product_name?: string;
      warranty_period?: string;
      warranty_status?: string;
      warranty_terms?: string;
    };
    refund_data?: {
      refund_amount: number;
      refund_reason?: string;
      refund_status?: string;
      refund_method?: string;
    };
    raw_text: string;
    confidence: number;
  };
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageIds, days = 7 } = await request.json();

    if (!messageIds || !Array.isArray(messageIds)) {
      return NextResponse.json({ error: 'Invalid messageIds' }, { status: 400 });
    }

    console.log(`🚀 Processing ${messageIds.length} emails with Python backend...`);

    const gmail = await getGmailClient();
    const results = [];

    // Process each email
    for (const messageId of messageIds) {
      try {
        console.log(`📧 Processing email: ${messageId}`);
        
        // Get full message details
        const messageResponse = await gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'full'
        });

        const message = messageResponse.data;
        const headers = message.payload?.headers || [];
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
        const from = headers.find((h: any) => h.name === 'From')?.value || '';
        const date = headers.find((h: any) => h.name === 'Date')?.value || '';

        // Extract email body
        const emailBody = extractEmailBody(message.payload);

        // Find PDF attachments
        const pdfAttachments = await extractPdfAttachments(gmail, messageId, message.payload);

        if (pdfAttachments.length === 0) {
          console.log(`⚠️ No PDF attachments found in ${messageId}`);
          continue;
        }

        // Process each PDF attachment with the backend
        for (const pdfAttachment of pdfAttachments) {
          try {
            console.log(`📄 Processing PDF: ${pdfAttachment.filename}`);
            
            // Send PDF data to Python backend
            const backendResponse = await sendToBackend({
              messageId,
              subject,
              from,
              date,
              body: emailBody,
              pdfAttachments: [pdfAttachment]
            });

            if (backendResponse.success && backendResponse.data) {
              // Transform backend response to frontend format
              const processedData = transformBackendResponse(backendResponse.data, {
                messageId,
                subject,
                from,
                date
              });

              results.push(processedData);
              console.log(`✅ Successfully processed: ${pdfAttachment.filename}`);
            } else {
              console.error(`❌ Backend processing failed: ${backendResponse.error}`);
            }

          } catch (error) {
            console.error(`❌ Error processing PDF ${pdfAttachment.filename}:`, error);
          }
        }

      } catch (error) {
        console.error(`❌ Error processing email ${messageId}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        processed: results.length,
        invoices: results,
        totalSpent: results.reduce((sum, inv) => sum + (inv.amount || 0), 0),
        purchaseCount: results.length
      },
      summary: {
        totalInvoices: results.length,
        totalAmount: results.reduce((sum, inv) => sum + (inv.amount || 0), 0)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error in process-email-backend:', error);
    return NextResponse.json(
      { error: 'Failed to process emails', details: error.message },
      { status: 500 }
    );
  }
}

async function sendToBackend(emailData: EmailData): Promise<BackendResponse> {
  try {
    const response = await fetch(`${PDF_PARSER_BACKEND_URL}/process-email-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_data: emailData,
        process_all_attachments: true
      })
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error sending to backend:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function transformBackendResponse(backendData: any, emailContext: any) {
  return {
    id: emailContext.messageId,
    messageId: emailContext.messageId,
    vendor: backendData.vendor || 'Unknown Vendor',
    amount: backendData.amount || 0,
    date: backendData.date || emailContext.date,
    subject: emailContext.subject,
    from: emailContext.from,
    invoiceNumber: backendData.invoice_number,
    documentType: backendData.document_type,
    confidence: backendData.confidence || 0.8,
    source: 'backend-pdf-parser',
    
    // Invoice specific data
    invoiceData: backendData.invoice_data ? {
      products: backendData.invoice_data.products || [],
      taxAmount: backendData.invoice_data.tax_amount || 0,
      paymentMethod: backendData.invoice_data.payment_method,
      shippingCost: backendData.invoice_data.shipping_cost || 0,
      discount: backendData.invoice_data.discount || 0,
      totalAmount: backendData.amount || 0
    } : null,

    // Warranty specific data
    warrantyData: backendData.warranty_data ? {
      productName: backendData.warranty_data.product_name,
      warrantyPeriod: backendData.warranty_data.warranty_period,
      warrantyStatus: backendData.warranty_data.warranty_status,
      warrantyTerms: backendData.warranty_data.warranty_terms
    } : null,

    // Refund specific data
    refundData: backendData.refund_data ? {
      refundAmount: backendData.refund_data.refund_amount,
      refundReason: backendData.refund_data.refund_reason,
      refundStatus: backendData.refund_data.refund_status,
      refundMethod: backendData.refund_data.refund_method
    } : null,

    // Raw extracted text
    rawText: backendData.raw_text || '',
    
    // Metadata
    metadata: {
      filename: backendData.filename,
      processingTime: Date.now(),
      backendProcessed: true
    },
    
    // Attachment metadata for download/preview
    attachmentId: backendData.attachment_metadata?.attachmentId,
    attachmentFilename: backendData.attachment_metadata?.filename,
    attachmentMimeType: backendData.attachment_metadata?.mimeType,
    attachmentSize: backendData.attachment_metadata?.size
  };
}

function extractEmailBody(payload: any): string {
  if (!payload) return '';

  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.mimeType === 'text/html' && part.body?.data) {
        // Extract text from HTML
        const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }
  }

  return '';
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
    if (part.filename && part.filename.toLowerCase().endsWith('.pdf')) {
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
            filename: part.filename,
            mimeType: part.mimeType,
            data: attachmentResponse.data.data
          });
        }
      } catch (error) {
        console.error(`Error downloading PDF attachment ${part.filename}:`, error);
      }
    }

    // Check nested parts
    if (part.parts) {
      const nestedPdfs = await extractPdfAttachments(gmail, messageId, part);
      pdfAttachments.push(...nestedPdfs);
    }
  }

  return pdfAttachments;
}
