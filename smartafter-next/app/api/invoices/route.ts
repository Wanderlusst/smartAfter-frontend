import { NextRequest, NextResponse } from 'next/server';
import { createDatabaseService } from '@/lib/dbService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const category = searchParams.get('category');
    const days = parseInt(searchParams.get('days') || '0');

    // Create database service
    const dbService = await createDatabaseService(session.user.email);

    let invoices;
    if (category) {
      invoices = await dbService.getInvoicesByCategory(category, limit);
    } else if (days > 0) {
      invoices = await dbService.getRecentInvoices(days, limit);
    } else {
      invoices = await dbService.getInvoices(limit, offset);
    }

    return NextResponse.json({
      success: true,
      invoices,
      count: invoices.length
    });

  } catch (error: any) {

    return NextResponse.json(
      { 
        error: 'Failed to fetch invoices',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Create database service and delete invoice
    const dbService = await createDatabaseService(session.user.email);
    const success = await dbService.deleteInvoice(invoiceId);

    return NextResponse.json({
      success,
      message: success ? 'Invoice deleted successfully' : 'Failed to delete invoice'
    });

  } catch (error: any) {

    return NextResponse.json(
      { 
        error: 'Failed to delete invoice',
        details: error.message 
      },
      { status: 500 }
    );
  }
}