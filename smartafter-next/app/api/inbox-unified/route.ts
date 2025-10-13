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
    const days = parseInt(searchParams.get('days') || '30');
    const maxResults = parseInt(searchParams.get('maxResults') || '100');

    console.log(`🔄 Fetching unified inbox data for ${days} days with ${maxResults} max results`);

    // Create Supabase client
    const supabase = createServerClient();

    // Fetch Gmail data from the existing API
    let gmailData = { purchases: [], totalSpent: 0, purchaseCount: 0 };
    try {
      const gmailResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/invoices-backend-enhanced?maxResults=${maxResults}&days=${days}`);
      if (gmailResponse.ok) {
        const gmailResult = await gmailResponse.json();
        if (gmailResult.success && gmailResult.data) {
          gmailData = gmailResult.data;
        }
      }
    } catch (error) {
      console.warn('Failed to fetch Gmail data:', error);
    }

    // Fetch manual uploads from database
    let manualUploads = [];
    try {
      console.log(`🔍 Fetching manual uploads for user: ${session.user.email}`);
      
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', session.user.email)
        .eq('category', 'Manual Upload')
        .order('created_at', { ascending: false })
        .limit(maxResults);

      console.log(`📊 Manual uploads query result:`, {
        count: invoices?.length || 0,
        error: invoicesError,
        sample: invoices?.[0]
      });

      if (invoicesError) {
        console.error('Error fetching manual uploads:', invoicesError);
      } else {
        manualUploads = (invoices || []).map(invoice => ({
          id: invoice.id,
          vendor: invoice.merchant_name || 'Unknown Vendor',
          amount: invoice.total_amount || 0,
          date: invoice.purchase_date || invoice.created_at,
          subject: invoice.source_email_subject || 'Manual Upload',
          from: invoice.source_email_from || 'Manual Upload',
          document_type: invoice.category || 'manual_upload',
          has_invoice: true,
          source: 'manual_upload',
          parsed_data: invoice.parsed_data,
          created_at: invoice.created_at
        }));
        
        console.log(`✅ Processed ${manualUploads.length} manual uploads`);
      }
    } catch (error) {
      console.error('Error fetching manual uploads from database:', error);
    }

    // Combine both data sources
    const allPurchases = [...gmailData.purchases, ...manualUploads];
    const totalSpent = allPurchases.reduce((sum, purchase) => sum + (parseFloat(purchase.amount) || 0), 0);

    console.log(`📊 UNIFIED API RESULT:`, {
      totalPurchases: allPurchases.length,
      gmailCount: gmailData.purchases.length,
      manualCount: manualUploads.length,
      totalSpent: totalSpent,
      sampleManual: manualUploads[0],
      sampleGmail: gmailData.purchases[0]
    });

    return NextResponse.json({
      success: true,
      data: {
        purchases: allPurchases,
        totalSpent,
        purchaseCount: allPurchases.length,
        gmailCount: gmailData.purchases.length,
        manualCount: manualUploads.length,
        documents: {
          total: allPurchases.length,
          receipts: allPurchases.filter(p => p.document_type === 'receipt').length,
          invoices: allPurchases.filter(p => p.document_type === 'invoice').length,
          manual: manualUploads.length
        }
      },
      summary: {
        totalEmails: allPurchases.length,
        totalAmount: totalSpent,
        processingTime: Date.now(),
        purchasesFound: allPurchases.length,
        gmailPurchases: gmailData.purchases.length,
        manualPurchases: manualUploads.length,
        source: 'unified-inbox'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in unified inbox API:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch inbox data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
