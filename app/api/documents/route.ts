import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 API DEBUG - Documents API called - Credit card filtering enabled');
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('❌ API ERROR - Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔐 AUTH DEBUG - User authenticated:', {
      email: session.user.email,
      hasAccessToken: !!session.accessToken,
      hasRefreshToken: !!session.refreshToken,
      needsReauth: session.needsReauth,
      scope: session.scope,
      accessTokenLength: session.accessToken?.length || 0,
      refreshTokenLength: session.refreshToken?.length || 0
    });

    // Import the FIXED Gmail document extraction function
    const { extractDocumentsWithAttachments } = await import('@/lib/gmail');

    // Extract real documents with attachments from Gmail - FIXED VERSION
    console.log('🔄 API DEBUG - Extracting documents from Gmail...');
    const documents = await extractDocumentsWithAttachments(30); // Last 30 days
    console.log('🔄 API DEBUG - Extracted documents:', documents.length);
    
    if (documents.length === 0) {
      console.log('🔄 API DEBUG - No documents found');
      return NextResponse.json({
        documents: [],
        totalDocuments: 0,
        totalAttachments: 0,
        count: 0,
        receipts: 0,
        invoices: 0,
        fetchedAt: new Date().toISOString(),
        source: 'gmail-no-documents',
        message: 'No documents with attachments found in Gmail'
      });
    }

    // Calculate summary stats
    const receipts = documents.filter(d => d.type === 'receipt').length;
    const invoices = documents.filter(d => d.type === 'invoice').length;
    
    const responseData = {
      documents,
      totalDocuments: documents.length,
      totalAttachments: documents.length,
      count: documents.length,
      receipts,
      invoices,
      fetchedAt: new Date().toISOString(),
      source: 'gmail-real-documents',
      message: `Real documents loaded from Gmail (${documents.length} total)`
    };
    
    console.log('🔄 API DEBUG - Returning response with documents:', documents.length);
    
    // Add cache-busting headers to force fresh data
    const response = NextResponse.json(responseData);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
    
  } catch (error) {
    console.error('❌ API ERROR - Failed to fetch documents:', error);
    console.error('❌ API ERROR - Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      cause: error instanceof Error ? error.cause : 'No cause'
    });
    return NextResponse.json({
      error: 'Failed to fetch documents',
      message: error instanceof Error ? error.message : 'Unknown error',
      documents: [],
      totalDocuments: 0,
      totalAttachments: 0,
      count: 0,
      receipts: 0,
      invoices: 0,
      fetchedAt: new Date().toISOString(),
      source: 'gmail-error'
    }, { status: 500 });
  }
}
