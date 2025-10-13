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
      // Get warranties from Supabase using email as user_id
      console.log('🔍 Fetching warranties from Supabase for user:', session.user.email);
      const { data: warranties, error: warrantiesError } = await supabase
        .from('warranties')
        .select('*')
        .eq('user_id', session.user.email)
        .order('created_at', { ascending: false });

      console.log('📊 Warranties query result:', { 
        count: warranties?.length || 0, 
        error: warrantiesError,
        sample: warranties?.[0] 
      });

      if (warrantiesError) {
        console.error('❌ Error fetching warranties from Supabase:', warrantiesError);
        throw warrantiesError;
      }

      // Process warranties data
      const processedWarranties = processWarrantiesFromSupabase(warranties || []);
      
      const data = {
        warranties: processedWarranties.warranties,
        claims: processedWarranties.claims,
        fetchedAt: new Date().toISOString(),
        source: 'supabase',
        count: processedWarranties.warranties.length + processedWarranties.claims.length
      };

      return NextResponse.json(data);
    } catch (error) {
      console.error('❌ Error fetching warranties:', error);
      
      // Return empty data as fallback
      return NextResponse.json({
        warranties: [],
        claims: [],
        fetchedAt: new Date().toISOString(),
        source: 'error-fallback',
        count: 0
      });
    }

  } catch (error) {
    
    return NextResponse.json(
      { error: 'Failed to fetch warranties data' },
      { status: 500 }
    );
  }
}

function processWarrantiesFromSupabase(warranties: any[]) {
  const processedWarranties = warranties.map((warranty: any, index: number) => ({
    id: warranty.id || (index + 1).toString(),
    item: warranty.item || warranty.subject || 'Unknown Item',
    coverage: warranty.coverage || warranty.amount || '₹0',
    expiryDate: warranty.expiry_date || warranty.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    daysLeft: warranty.days_left || warranty.daysLeft || 365,
    status: warranty.status || 'active',
    type: warranty.type || 'Standard Warranty',
    vendor: warranty.vendor || 'Unknown Vendor'
  }));

  // For now, return empty claims array since we don't have a separate claims table
  const processedClaims: any[] = [];

  return {
    warranties: processedWarranties,
    claims: processedClaims
  };
}

// Legacy function for Gmail data (kept for compatibility)
function processWarranties(warrantyData: any) {
  const processedWarranties = warrantyData.warranties?.map((warranty: any, index: number) => ({
    id: (index + 1).toString(),
    item: warranty.item || warranty.subject || 'Unknown Item',
    coverage: warranty.coverage || '₹0',
    expiryDate: warranty.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    daysLeft: warranty.daysLeft || 365,
    status: warranty.status || 'active',
    type: warranty.type || 'Standard Warranty',
    vendor: warranty.vendor || 'Unknown Vendor'
  })) || [];

  const processedClaims = warrantyData.claims?.map((claim: any, index: number) => ({
    id: `claim-${index + 1}`,
    item: claim.item || claim.subject || 'Unknown Item',
    amount: claim.amount || '₹0',
    date: claim.date || new Date().toISOString().split('T')[0],
    status: claim.status || 'processing'
  })) || [];

  return {
    warranties: processedWarranties,
    claims: processedClaims
  };
} 