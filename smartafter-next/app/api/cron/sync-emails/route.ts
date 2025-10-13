import { NextRequest, NextResponse } from 'next/server';
import { createInvoiceProcessor } from '@/lib/invoiceProcessor';
import { headers } from 'next/headers';

// Verify this is a legitimate cron request
function verifyCronRequest(request: NextRequest): boolean {
  // In production, you should verify the cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    
    return true;
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    if (!verifyCronRequest(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create processor and process recent invoices
    const processor = await createInvoiceProcessor();
    
    // Process last 7 days of emails
    const result = await processor.processInvoices({
      days: 7,
      maxResults: 100,
      skipExisting: true,
      storeRawPdf: true,
      retryFailed: false
    });

    return NextResponse.json({
      success: true,
      message: 'Daily email sync completed',
      result: {
        processed: result.processed,
        failed: result.failed,
        skipped: result.skipped,
        processingTime: result.processingTime
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

    return NextResponse.json(
      { 
        error: 'Daily email sync failed',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

// Allow GET for testing
export async function GET(request: NextRequest) {
  try {

    const processor = await createInvoiceProcessor();
    
    // Test with just 1 day and 10 results for testing
    const result = await processor.processInvoices({
      days: 1,
      maxResults: 10,
      skipExisting: true,
      storeRawPdf: false, // Don't store PDFs in test mode
      retryFailed: false
    });

    return NextResponse.json({
      success: true,
      message: 'Test sync completed',
      result: {
        processed: result.processed,
        failed: result.failed,
        skipped: result.skipped,
        processingTime: result.processingTime
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

    return NextResponse.json(
      { 
        error: 'Test sync failed',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
