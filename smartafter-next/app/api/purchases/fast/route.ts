import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { createServerClient } from '@/app/lib/supabaseClient';

// Cache configuration
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=120, stale-while-revalidate=300',
  'CDN-Cache-Control': 'public, max-age=120',
  'Vercel-CDN-Cache-Control': 'public, max-age=120'
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cache = searchParams.get('cache') === 'true';
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    
    // Check cache first if not forcing refresh
    if (cache && !forceRefresh) {
      // In a real implementation, you'd check Redis or similar
      // For now, we'll always fetch fresh data but with optimizations
    }

    const supabase = createServerClient();
    
    // Optimized query with minimal data fetching
    const { data: purchases, error } = await supabase
      .from('purchases')
      .select(`
        id,
        vendor,
        amount,
        date,
        category,
        has_invoice,
        created_at
      `)
      .eq('user_id', session.user.email)
      .order('date', { ascending: false })
      .limit(50); // Limit for performance

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Calculate totals efficiently
    const totalSpent = purchases?.reduce((sum, purchase) => {
      const amount = parseFloat(purchase.amount || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0) || 0;

    const response = {
      success: true,
      purchases: purchases || [],
      totalSpent,
      count: purchases?.length || 0,
      cached: false,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, {
      status: 200,
      headers: CACHE_HEADERS
    });

  } catch (error) {
    console.error('Fast purchases API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchases' },
      { status: 500 }
    );
  }
}
