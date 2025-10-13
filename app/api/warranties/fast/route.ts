import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

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

    // Use cache service data instead of database
    const { CacheService } = await import('../../../lib/cacheService');
    const cacheData = CacheService.getServerData();
    
    // Transform cache data to warranty format
    const warranties = cacheData?.documents?.map(doc => ({
      id: doc.id,
      product_name: doc.title || doc.subject || 'Product',
      vendor: doc.vendor || 'Unknown Vendor',
      purchase_date: doc.date || new Date().toISOString(),
      warranty_end_date: new Date(new Date(doc.date || new Date()).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active'
    })) || [];

    // Calculate active warranties
    const activeWarranties = warranties?.filter(w => w.status === 'active').length || 0;
    const expiringSoon = warranties?.filter(w => {
      if (!w.warranty_end_date) return false;
      const endDate = new Date(w.warranty_end_date);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    }).length || 0;

    const response = {
      success: true,
      warranties: warranties || [],
      activeWarranties,
      expiringSoon,
      count: warranties?.length || 0,
      cached: false,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, {
      status: 200,
      headers: CACHE_HEADERS
    });

  } catch (error) {
    console.error('Fast warranties API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch warranties' },
      { status: 500 }
    );
  }
}
