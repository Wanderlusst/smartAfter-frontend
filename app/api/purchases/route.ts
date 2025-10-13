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
    const useSSR = searchParams.get('ssr') === 'true';
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    // Always fetch fresh data from Gmail API (unless explicitly SSR)
    if (useSSR) {

      try {
        // Try to fetch real Gmail data for SSR
        const { extractPurchases } = await import('@/lib/gmail');
        
        const purchaseData = await extractPurchases(30);
        
        const processedPurchases = processPurchases(purchaseData);
        const statistics = calculateStatistics(processedPurchases);
        
        const ssrData = {
          purchases: processedPurchases,
          statistics,
          fetchedAt: new Date().toISOString(),
          source: 'server-side-real-data',
          count: processedPurchases.length
        };

        return NextResponse.json(ssrData);
      } catch (gmailError) {

        // Return empty data - no fallback
        const emptySsrData = {
          purchases: [],
          statistics: {
            totalSpent: 0,
            totalPurchases: 0,
            averageAmount: 0,
            categoryStats: {},
            merchantStats: {}
          },
          fetchedAt: new Date().toISOString(),
          source: 'gmail-api-error',
          count: 0
        };

        return NextResponse.json(emptySsrData);
      }
    }

    // For all other cases, fetch fresh data from Gmail API

    try {
      // Import the Gmail extraction function
      const { extractPurchases } = await import('@/lib/gmail');
      
      const rawPurchases = await extractPurchases(90);

      // Process purchases data
      const processedPurchases = processPurchases(rawPurchases);
      const statistics = calculateStatistics(processedPurchases);
      
      const freshData = {
        purchases: processedPurchases,
        statistics,
        fetchedAt: new Date().toISOString(),
        source: 'fresh-data',
        count: processedPurchases.length
      };

      return NextResponse.json(freshData);
    } catch (gmailError) {
      
      // Return cached data as fallback
      return NextResponse.json({
        purchases: [],
        statistics: {
          totalSpent: 0,
          totalPurchases: 0,
          averageAmount: 0,
          categoryStats: {},
          merchantStats: {}
        },
        fetchedAt: new Date().toISOString(),
        source: 'fallback',
        count: 0
      });
    }

  } catch (error) {
    
    return NextResponse.json(
      { error: 'Failed to fetch purchases data' },
      { status: 500 }
    );
  }
}

function processPurchases(rawPurchases: any[]) {
  return rawPurchases.map((purchase, index) => ({
    id: (index + 1).toString(),
    item: purchase.description || purchase.subject || 'Unknown Item',
    merchant: purchase.merchant || purchase.vendor || 'Unknown Merchant',
    amount: parseFloat(purchase.amount?.replace('₹', '') || '0') || 0,
    date: purchase.date || new Date().toISOString().split('T')[0],
    category: purchase.category || 'Other',
    description: purchase.description || purchase.subject || 'No description',
    isInvoice: true
  }));
}

function calculateStatistics(purchases: any[]) {
  const totalSpent = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPurchases = purchases.length;
  const averageAmount = totalPurchases > 0 ? totalSpent / totalPurchases : 0;

  // Calculate category statistics
  const categoryStats: Record<string, { count: number; total: number; purchases: any[] }> = {};
  purchases.forEach(purchase => {
    const category = purchase.category || 'Other';
    if (!categoryStats[category]) {
      categoryStats[category] = { count: 0, total: 0, purchases: [] };
    }
    categoryStats[category].count += 1;
    categoryStats[category].total += purchase.amount || 0;
    categoryStats[category].purchases.push(purchase);
  });

  // Calculate merchant statistics
  const merchantStats: Record<string, { count: number; total: number; purchases: any[] }> = {};
  purchases.forEach(purchase => {
    const merchant = purchase.merchant || 'Unknown';
    if (!merchantStats[merchant]) {
      merchantStats[merchant] = { count: 0, total: 0, purchases: [] };
    }
    merchantStats[merchant].count += 1;
    merchantStats[merchant].total += purchase.amount || 0;
    merchantStats[merchant].purchases.push(purchase);
  });

  return {
    totalSpent,
    totalPurchases,
    averageAmount,
    categoryStats,
    merchantStats
  };
}
