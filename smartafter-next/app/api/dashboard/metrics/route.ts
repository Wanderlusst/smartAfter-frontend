import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric');
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    // Fetch fresh data from Gmail API if force refresh is requested
    if (forceRefresh) {
      // Import the Gmail extraction function
      const { extractPurchases } = await import('@/lib/gmail');
      
      const rawPurchases = await extractPurchases(90);

      // Process the data based on the requested metric
      const processedData = processMetricData(rawPurchases, metric);
      
      return NextResponse.json({
        metric,
        value: processedData.value,
        count: processedData.count,
        amount: processedData.amount,
        timestamp: new Date().toISOString(),
        source: 'fresh-data'
      });
    }

    // Return cached/sample data for immediate response
    const cachedData = getCachedMetricData(metric);
    
    return NextResponse.json({
      metric,
      value: cachedData.value,
      count: cachedData.count || 0,
      amount: cachedData.amount || 0,
      timestamp: new Date().toISOString(),
      source: 'cached-data'
    });

  } catch (error) {
    
    return NextResponse.json(
      { error: 'Failed to fetch metric data' },
      { status: 500 }
    );
  }
}

interface MetricData {
  value: number;
  count?: number;
  amount?: number;
  receipts?: number;
  invoices?: number;
}

function processMetricData(rawPurchases: Array<{ amount: string | number; date: string; isReceipt?: boolean; isInvoice?: boolean }>, metric: string | null): MetricData {
  switch (metric) {
    case 'totalSpent':
      const totalSpent = rawPurchases.reduce((sum, purchase) => {
        const amount = parseFloat(purchase.amount) || 0;
        return sum + amount;
      }, 0);
      return { value: totalSpent, amount: totalSpent };

    case 'purchaseCount':
      return { value: rawPurchases.length, count: rawPurchases.length };

    case 'activeWarranties':
      const warranties = rawPurchases.filter(purchase => {
        const purchaseDate = new Date(purchase.date);
        const warrantyEndDate = new Date(purchaseDate.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year warranty
        return warrantyEndDate > new Date();
      });
      return { value: warranties.length, count: warranties.length };

    case 'documents':
      const receipts = rawPurchases.filter(p => p.isReceipt);
      const invoices = rawPurchases.filter(p => p.isInvoice);
      return { 
        value: receipts.length + invoices.length,
        count: receipts.length + invoices.length,
        receipts: receipts.length,
        invoices: invoices.length
      };

    case 'refundable':
      const refundableAmount = rawPurchases.reduce((sum, purchase) => {
        const amount = parseFloat(purchase.amount) || 0;
        // Assume 5% of purchases are refundable
        return sum + (amount * 0.05);
      }, 0);
      return { value: refundableAmount, amount: refundableAmount };

    default:
      return { value: 0, count: 0, amount: 0 };
  }
}

function getCachedMetricData(metric: string | null): MetricData {
  // Sample cached data for immediate response
  const cachedData: Record<string, MetricData> = {
    totalSpent: { value: 8969.97, amount: 8969.97 },
    purchaseCount: { value: 6, count: 6 },
    activeWarranties: { value: 2, count: 2 },
    documents: { value: 12, count: 12, receipts: 6, invoices: 6 },
    refundable: { value: 448.50, amount: 448.50 }
  };

  return cachedData[metric as keyof typeof cachedData] || { value: 0, count: 0, amount: 0 };
} 