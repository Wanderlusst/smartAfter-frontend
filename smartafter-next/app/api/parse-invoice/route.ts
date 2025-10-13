import { NextRequest, NextResponse } from 'next/server';
import { parseInvoiceText, parseInvoiceFile, ParsedInvoice } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const text = formData.get('text') as string;
    const file = formData.get('file') as File;

    // Validate input
    if (!text && !file) {
      return NextResponse.json(
        { error: 'Either text or file must be provided' },
        { status: 400 }
      );
    }

    let parsedInvoice: ParsedInvoice;

    if (text) {
      // Parse from text content
      parsedInvoice = await parseInvoiceText(text);
    } else if (file) {
      // Validate file type
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'application/pdf',
        'text/plain'
      ];

      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'Unsupported file type. Please upload JPEG, PNG, WebP, PDF, or text files.' },
          { status: 400 }
        );
      }

      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: 'File size too large. Maximum size is 10MB.' },
          { status: 400 }
        );
      }

      // Parse from file
      parsedInvoice = await parseInvoiceFile(file);
    } else {
      return NextResponse.json(
        { error: 'Invalid input provided' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: parsedInvoice,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('GEMINI_API_KEY')) {
        return NextResponse.json(
          { error: 'Gemini API key not configured' },
          { status: 500 }
        );
      }
      
      if (error.message.includes('Failed to parse')) {
        return NextResponse.json(
          { error: 'Failed to parse invoice. Please check the input format.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle GET requests for testing
export async function GET() {
  return NextResponse.json({
    message: 'Invoice Parser API',
    endpoints: {
      POST: 'Send form data with either "text" or "file" field',
      examples: {
        text: 'Send text field with Gmail body content',
        file: 'Send file field with invoice image/PDF'
      }
    },
    supportedFormats: ['JPEG', 'PNG', 'WebP', 'PDF', 'Text'],
    maxFileSize: '10MB'
  });
}
