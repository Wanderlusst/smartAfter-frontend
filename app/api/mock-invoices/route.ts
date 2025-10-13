import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Generate mock invoice data
    const mockInvoices = [
      {
        id: 'mock-1',
        messageId: 'mock-message-1',
        subject: 'Your Amazon.in order #123-4567890-1234567',
        from: 'auto-confirm@amazon.in',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        vendor: 'Amazon',
        amount: 1299,
        currency: 'INR',
        hasPdfAttachments: true,
        category: 'Shopping'
      },
      {
        id: 'mock-2',
        messageId: 'mock-message-2',
        subject: 'Swiggy Order Confirmation - Order #SW123456',
        from: 'noreply@swiggy.com',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        vendor: 'Swiggy',
        amount: 450,
        currency: 'INR',
        hasPdfAttachments: false,
        category: 'Food'
      },
      {
        id: 'mock-3',
        messageId: 'mock-message-3',
        subject: 'Invoice for your Flipkart purchase',
        from: 'no-reply@flipkart.com',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        vendor: 'Flipkart',
        amount: 2499,
        currency: 'INR',
        hasPdfAttachments: true,
        category: 'Shopping'
      },
      {
        id: 'mock-4',
        messageId: 'mock-message-4',
        subject: 'Uber Receipt - Trip to Airport',
        from: 'receipts@uber.com',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        vendor: 'Uber',
        amount: 850,
        currency: 'INR',
        hasPdfAttachments: true,
        category: 'Transport'
      },
      {
        id: 'mock-5',
        messageId: 'mock-message-5',
        subject: 'Netflix Monthly Subscription',
        from: 'info@netflix.com',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        vendor: 'Netflix',
        amount: 199,
        currency: 'INR',
        hasPdfAttachments: false,
        category: 'Entertainment'
      }
    ];

    const totalAmount = mockInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);

    return NextResponse.json({
      success: true,
      data: {
        invoices: mockInvoices,
        totalAmount,
        totalEmails: mockInvoices.length,
        summary: {
          totalSpent: totalAmount,
          purchaseCount: mockInvoices.length,
          activeWarranties: 3,
          refundOpportunities: 1
        }
      },
      message: 'Mock invoice data generated successfully'
    });

  } catch (error: any) {
    
    return NextResponse.json({
      success: false,
      error: error.message
    });
  }
}
