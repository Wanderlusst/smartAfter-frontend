import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getLast7DaysInvoices } from '@/lib/gmail';

export async function GET(request: NextRequest) {
  try {

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated',
        needsLogin: true
      }, { status: 401 });
    }

    // Get real invoice data using the working function
    console.log('🔄 Starting Gmail data fetch for user:', session.user.email);
    const invoices = await getLast7DaysInvoices(30);
    console.log('📧 Raw invoices found:', invoices.length);

    // Filter for actual invoices only (exclude promotional/notification emails)
    const actualInvoices = invoices.filter(email => {
      // Skip promotional/notification emails
      const subject = email.subject?.toLowerCase() || '';
      const isPromotional = subject.includes('notification') || 
                           subject.includes('posted on your timeline') ||
                           subject.includes('commented on') ||
                           subject.includes('looks, blessed') ||
                           subject.includes('wrote something') ||
                           subject.includes('digital happiness') ||
                           subject.includes('subscribe') ||
                           subject.includes('unsubscribe') ||
                           subject.includes('promotional') ||
                           subject.includes('marketing') ||
                           subject.includes('newsletter') ||
                           subject.includes('offers') ||
                           subject.includes('deals') ||
                           subject.includes('sale') ||
                           subject.includes('discount');
      
      if (isPromotional) {
        return false;
      }
      
      // Skip emails from known promotional vendors with ₹0 amounts
      const vendor = email.vendor?.toLowerCase() || '';
      const isPromotionalVendor = (vendor.includes('zomato') && email.amount === '₹0') ||
                                 (vendor.includes('myntra') && email.amount === '₹0') ||
                                 (vendor.includes('facebook') && email.amount === '₹0');
      
      if (isPromotionalVendor) {
        return false;
      }
      
      // Only include actual invoices or emails with amounts > 0
      const hasAmount = parseFloat(email.amount.replace(/[₹,]/g, '')) > 0;
      return email.isInvoice || hasAmount;
    });
    
    console.log('📊 After filtering - actual invoices:', actualInvoices.length);
    console.log('📧 Sample invoices:', actualInvoices.slice(0, 3).map(inv => ({
      vendor: inv.vendor,
      amount: inv.amount,
      subject: inv.subject
    })));

    // Calculate total amount
    const totalAmount = actualInvoices.reduce((sum, inv) => {
      const amount = parseFloat(inv.amount.replace(/[₹,]/g, '')) || 0;
      return sum + amount;
    }, 0);

    // Transform to dashboard format
    const dashboardData = {
      totalSpent: totalAmount,
      purchaseCount: actualInvoices.length,
      purchases: actualInvoices.map((invoice: any) => ({
        id: invoice.id,
        vendor: invoice.vendor,
        amount: parseFloat(invoice.amount.replace(/[₹,]/g, '')) || 0,
        date: invoice.date,
        subject: invoice.subject,
        isInvoice: invoice.isInvoice,
        confidence: 0.9,
        source: 'real-gmail'
      })),
      documents: { 
        total: actualInvoices.length,
        invoices: actualInvoices.filter((inv: any) => inv.isInvoice).length
      },
      refundOpportunities: [],
      warranties: [],
      hasInitialData: true,
      source: 'real-gmail',
      message: `Real Gmail data loaded: ${actualInvoices.length} invoices (₹${totalAmount} total)`
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
      summary: {
        totalInvoices: actualInvoices.length,
        totalAmount: totalAmount,
        vendors: [...new Set(actualInvoices.map(inv => inv.vendor))],
        dateRange: {
          from: actualInvoices.length > 0 ? actualInvoices[actualInvoices.length - 1].date : null,
          to: actualInvoices.length > 0 ? actualInvoices[0].date : null
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {

    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get Gmail data',
      data: {
        totalSpent: 0,
        purchaseCount: 0,
        purchases: [],
        documents: { total: 0, invoices: 0 },
        refundOpportunities: [],
        warranties: [],
        hasInitialData: false,
        source: 'error',
        message: 'Failed to load Gmail data'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
