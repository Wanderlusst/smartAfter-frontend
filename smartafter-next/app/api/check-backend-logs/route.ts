import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.PDF_PARSER_BACKEND_URL || 'https://smartafter-backend-1.onrender.com';
    
    // Test if backend is receiving requests
    const response = await fetch(`${backendUrl}/health`);
    const backendStatus = await response.json();
    
    // Test email processing
    const testEmailResponse = await fetch(`${backendUrl}/process-email-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_data: {
          messageId: 'test-check-123',
          subject: 'Test Check',
          from: 'test@example.com',
          date: new Date().toISOString(),
          body: 'Test body',
          pdfAttachments: []
        },
        process_all_attachments: true
      })
    });
    
    const testResult = await testEmailResponse.json();
    
    return NextResponse.json({
      success: true,
      backend_status: backendStatus,
      test_processing: testResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
