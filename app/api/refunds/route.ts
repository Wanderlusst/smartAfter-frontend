import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { createServerClient } from '@/app/lib/supabaseClient';

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

    // Fetch data from Supabase instead of Gmail parsing
    const supabase = createServerClient();
    
    try {
      // Get refund opportunities from Supabase using email as user_id
      console.log('🔍 Fetching refunds from Supabase for user:', session.user.email);
      const { data: refundOpportunities, error: refundsError } = await supabase
        .from('refund_opportunities')
        .select('*')
        .eq('user_id', session.user.email)
        .order('created_at', { ascending: false });

      if (refundsError) {
        console.error('❌ Error fetching refunds from Supabase:', refundsError);
        throw refundsError;
      }

      // Process refunds data
      const processedRefunds = processRefundsFromSupabase(refundOpportunities || []);
      
      const data = {
        refundOpportunities: processedRefunds.refundOpportunities,
        completedRefunds: processedRefunds.completedRefunds,
        fetchedAt: new Date().toISOString(),
        source: 'supabase',
        count: processedRefunds.refundOpportunities.length + processedRefunds.completedRefunds.length
      };

      return NextResponse.json(data);
    } catch (error) {
      console.error('❌ Error fetching refunds:', error);
      
      // Return empty data as fallback
      return NextResponse.json({
        refundOpportunities: [],
        completedRefunds: [],
        fetchedAt: new Date().toISOString(),
        source: 'error-fallback',
        count: 0
      });
    }

  } catch (error) {
    
    return NextResponse.json(
      { error: 'Failed to fetch refunds data' },
      { status: 500 }
    );
  }
}

function processRefundsFromSupabase(refundOpportunities: any[]) {
  const processedRefundOpportunities = refundOpportunities.map((refund: any, index: number) => ({
    id: refund.id || (index + 1).toString(),
    item: refund.item || refund.subject || 'Unknown Item',
    reason: refund.reason || 'Eligible for refund',
    amount: refund.amount || '₹0',
    daysLeft: refund.days_left || refund.daysLeft || 0,
    status: refund.status || 'eligible',
    date: refund.date || refund.created_at || new Date().toISOString().split('T')[0],
    vendor: refund.vendor || 'Unknown Vendor'
  }));

  // For now, return empty completed refunds array since we don't have a separate completed refunds table
  const processedCompletedRefunds: any[] = [];

  return {
    refundOpportunities: processedRefundOpportunities,
    completedRefunds: processedCompletedRefunds
  };
}

// Legacy function for Gmail data (kept for compatibility)
function processRefunds(refundData: any) {
  const processedRefundOpportunities = refundData.refundOpportunities?.map((refund: any, index: number) => ({
    id: (index + 1).toString(),
    item: refund.item || refund.subject || 'Unknown Item',
    reason: refund.reason || 'Eligible for refund',
    amount: refund.amount || '₹0',
    daysLeft: refund.daysLeft || 0,
    status: refund.status || 'eligible',
    date: refund.date || new Date().toISOString().split('T')[0],
    vendor: refund.vendor || 'Unknown Vendor'
  })) || [];

  const processedCompletedRefunds = refundData.completedRefunds?.map((refund: any, index: number) => ({
    id: `completed-${index + 1}`,
    item: refund.item || refund.subject || 'Unknown Item',
    reason: refund.reason || 'Refund processed',
    amount: refund.amount || '₹0',
    daysLeft: 0,
    status: 'completed',
    date: refund.date || new Date().toISOString().split('T')[0],
    vendor: refund.vendor || 'Unknown Vendor'
  })) || [];

  return {
    refundOpportunities: processedRefundOpportunities,
    completedRefunds: processedCompletedRefunds
  };
} 