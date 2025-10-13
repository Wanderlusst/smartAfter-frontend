import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DOWNLOAD API - Request received');
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.error('❌ DOWNLOAD API - Unauthorized access');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    const attachmentId = searchParams.get('attachmentId');

    console.log('🔍 DOWNLOAD DEBUG - Request params:', {
      messageId,
      attachmentId,
      messageIdLength: messageId?.length,
      attachmentIdLength: attachmentId?.length,
      url: request.url,
      userEmail: session.user.email
    });

    if (!messageId || !attachmentId) {
      console.error('❌ DOWNLOAD API - Missing required parameters');
      return NextResponse.json({ 
        error: 'Missing messageId or attachmentId',
        details: { messageId: !!messageId, attachmentId: !!attachmentId }
      }, { status: 400 });
    }

    console.log('🔍 DOWNLOAD API - Importing Gmail service...');
    
    // Import Gmail service
    const { downloadAttachment } = await import('@/lib/gmail');

    console.log('🔍 DOWNLOAD API - Downloading attachment...');
    
    // Download the attachment
    const attachmentData = await downloadAttachment(messageId, attachmentId);

    console.log('✅ DOWNLOAD API - Attachment downloaded successfully:', {
      filename: attachmentData.filename,
      mimeType: attachmentData.mimeType,
      dataSize: attachmentData.data.length
    });

    // Return the file with appropriate headers
    return new NextResponse(attachmentData.data, {
      headers: {
        'Content-Type': attachmentData.mimeType,
        'Content-Disposition': `attachment; filename="${attachmentData.filename}"`,
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error: any) {
    console.error('❌ DOWNLOAD API - Error downloading attachment:', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to download attachment',
        details: error.message,
        messageId: request.nextUrl.searchParams.get('messageId'),
        attachmentId: request.nextUrl.searchParams.get('attachmentId')
      },
      { status: 500 }
    );
  }
}
