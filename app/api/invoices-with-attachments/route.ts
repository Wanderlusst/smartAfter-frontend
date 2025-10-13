import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { extractInvoicesWithAttachments } from '@/lib/gmail';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Starting invoice extraction with attachments...');

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated',
        needsLogin: true
      }, { status: 401 });
    }

    // Get invoices with PDF attachments from last 7 days
    const invoices = await extractInvoicesWithAttachments(7);

    // Calculate total amount
    const totalAmount = invoices.reduce((sum, inv) => {
      const amount = parseFloat(inv.amount.replace(/[₹,]/g, '')) || 0;
      return sum + amount;
    }, 0);

    // Transform to dashboard format
    const dashboardData = {
      totalSpent: totalAmount,
      purchaseCount: invoices.length,
      purchases: invoices.map((invoice: any) => ({
        id: invoice.id,
        vendor: invoice.vendor,
        amount: parseFloat(invoice.amount.replace(/[₹,]/g, '')) || 0,
        date: invoice.date,
        subject: invoice.subject,
        isInvoice: invoice.isInvoice,
        hasAttachment: invoice.hasAttachment,
        attachmentCount: invoice.attachmentCount,
        attachmentDetails: invoice.attachmentDetails,
        confidence: invoice.confidence,
        source: invoice.source
      })),
      documents: { 
        total: invoices.length,
        invoices: invoices.filter((inv: any) => inv.isInvoice).length,
        withAttachments: invoices.filter((inv: any) => inv.hasAttachment).length
      },
      refundOpportunities: [],
      warranties: [],
      hasInitialData: true,
      source: 'gmail-pdf-attachments',
      message: `Invoices with PDF attachments: ${invoices.length} invoices (₹${totalAmount} total)`
    };

    console.log(`✅ Invoice extraction completed: ${invoices.length} invoices with PDF attachments found`);

    return NextResponse.json({
      success: true,
      data: dashboardData,
      summary: {
        totalInvoices: invoices.length,
        totalAmount: totalAmount,
        withAttachments: invoices.filter(inv => inv.hasAttachment).length,
        vendors: [...new Set(invoices.map(inv => inv.vendor))],
        attachmentTypes: [...new Set(invoices.map(inv => inv.attachmentDetails?.mimeType).filter(Boolean))],
        dateRange: {
          from: invoices.length > 0 ? invoices[invoices.length - 1].date : null,
          to: invoices.length > 0 ? invoices[0].date : null
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error extracting invoices with attachments:', error);

    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get invoices with attachments',
      data: {
        totalSpent: 0,
        purchaseCount: 0,
        purchases: [],
        documents: { total: 0, invoices: 0, withAttachments: 0 },
        refundOpportunities: [],
        warranties: [],
        hasInitialData: false,
        source: 'error',
        message: 'Failed to load invoices with attachments'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
