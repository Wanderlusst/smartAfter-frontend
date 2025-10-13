import { NextRequest, NextResponse } from 'next/server';
import { createInvoiceProcessor } from '@/lib/invoiceProcessor';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      days = 30,
      maxResults = 50,
      skipExisting = true,
      storeRawPdf = true,
      retryFailed = false
    } = body;

    // Create processor and process invoices
    const processor = await createInvoiceProcessor();
    const result = await processor.processInvoices({
      days,
      maxResults,
      skipExisting,
      storeRawPdf,
      retryFailed
    });

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error: any) {

    return NextResponse.json(
      { 
        error: 'Invoice processing failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get processing statistics
    const processor = await createInvoiceProcessor();
    const stats = await processor.getProcessingStats();

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error: any) {

    return NextResponse.json(
      { 
        error: 'Failed to get processing stats',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
