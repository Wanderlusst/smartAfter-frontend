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
    
    // Transform cache data to document format
    const transformedDocuments = cacheData?.documents?.map(doc => ({
      id: doc.id,
      vendor: doc.vendor || 'Unknown Vendor',
      amount: doc.amount || '₹0',
      date: doc.date || new Date().toISOString(),
      subject: doc.subject || doc.title || 'Document',
      isInvoice: doc.isInvoice || doc.type === 'invoice',
      filename: doc.name || doc.filename || 'document.pdf',
      type: doc.type || 'invoice'
    })) || [];

    const response = {
      success: true,
      documents: transformedDocuments,
      count: transformedDocuments.length,
      cached: false,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, {
      status: 200,
      headers: CACHE_HEADERS
    });

  } catch (error) {
    console.error('Fast documents API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
