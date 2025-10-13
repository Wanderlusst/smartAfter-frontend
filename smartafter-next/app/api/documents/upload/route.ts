import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { createServerClient } from '@/app/lib/supabaseClient';

// Function to parse file using the PDF parser backend
async function parseFileWithBackend(file: File) {
  try {
    console.log(`🔄 Sending file to PDF parser backend: ${file.name}`);
    
    const formData = new FormData();
    formData.append('file', file);
    
    const backendUrl = process.env.PDF_PARSER_BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/parse-pdf`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`✅ Backend parsing successful for: ${file.name}`);
    
    // Convert backend response to our expected format
    return {
      vendor: result.vendor || 'Unknown Vendor',
      invoiceNumber: result.invoice_number || '',
      date: result.date || new Date().toISOString(),
      total: result.amount || 0,
      subtotal: result.amount * 0.9, // Estimate
      taxes: result.amount * 0.1, // Estimate
      shipping: 0,
      discount: 0,
      currency: 'INR',
      items: result.invoice_data?.items || [{
        name: 'Parsed Item',
        description: 'Extracted from PDF',
        quantity: 1,
        unitPrice: result.amount || 0,
        price: result.amount || 0,
        category: 'Other'
      }],
      billingAddress: {
        name: result.invoice_data?.customer_name || '',
        address: result.invoice_data?.customer_address || '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      shippingAddress: {
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      paymentMethod: result.invoice_data?.payment_method || 'Unknown',
      orderNumber: result.invoice_number || '',
      poNumber: '',
      dueDate: '',
      notes: `Parsed using PDF backend (confidence: ${result.confidence || 0})`
    };
    
  } catch (error) {
    console.error(`❌ Backend parsing failed for ${file.name}:`, error);
    
    // Fallback to basic parsing
    return {
      vendor: 'Unknown Vendor',
      invoiceNumber: '',
      date: new Date().toISOString(),
      total: 0,
      subtotal: 0,
      taxes: 0,
      shipping: 0,
      discount: 0,
      currency: 'INR',
      items: [],
      billingAddress: {name: '', address: '', city: '', state: '', zipCode: '', country: ''},
      shippingAddress: {name: '', address: '', city: '', state: '', zipCode: '', country: ''},
      paymentMethod: 'Unknown',
      orderNumber: '',
      poNumber: '',
      dueDate: '',
      notes: `Backend parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadedFiles = [];
    const processedInvoices = [];

    // Create Supabase client
    const supabase = createServerClient();

    for (const file of files) {
      // Enhanced file type validation
      const allowedTypes = [
        'application/pdf',
        'image/jpeg', 
        'image/png', 
        'image/jpg',
        'image/gif',
        'image/webp',
        'application/octet-stream' // Allow this and check extension
      ];
      
      let isValidType = allowedTypes.includes(file.type);
      
      // If type is application/octet-stream, check file extension
      if (file.type === 'application/octet-stream') {
        const fileName = file.name.toLowerCase();
        const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
        isValidType = validExtensions.some(ext => fileName.endsWith(ext));
      }
      
      if (!isValidType) {
        return NextResponse.json({ 
          error: `File type ${file.type} not supported. Please upload PDF or image files. Supported formats: PDF, JPG, PNG, GIF, WEBP` 
        }, { status: 400 });
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return NextResponse.json({ 
          error: `File ${file.name} is too large. Maximum size is 10MB.` 
        }, { status: 400 });
      }

      try {
        // Process the file using the PDF parser backend
        console.log(`Processing uploaded file: ${file.name}`);
        const parsedInvoice = await parseFileWithBackend(file);
        
        // Generate a unique message ID for uploaded files
        const messageId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Store the invoice in the database (using the existing schema)
        const invoiceData = {
          user_id: session.user.id || session.user.email, // Fallback to email if id not available
          gmail_message_id: messageId,
          merchant_name: parsedInvoice.vendor || 'Unknown Vendor',
          invoice_number: parsedInvoice.invoiceNumber || null,
          purchase_date: parsedInvoice.date ? new Date(parsedInvoice.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          total_amount: parsedInvoice.total || 0,
          currency: 'INR',
          warranty_period: null,
          warranty_end_date: null,
          category: 'Manual Upload',
          status: 'processed' as const,
          raw_pdf_data: null, // We don't store raw PDF for uploaded files
          parsed_data: parsedInvoice,
          source_email_id: null,
          source_email_subject: `Manual Upload: ${file.name}`,
          source_email_from: 'Manual Upload',
        };

        const { data: storedInvoice, error: dbError } = await supabase
          .from('invoices')
          .upsert(invoiceData, {
            onConflict: 'gmail_message_id'
          })
          .select()
          .single();

        if (dbError) {
          console.error('Database error:', dbError);
          throw new Error(`Failed to store invoice: ${dbError.message}`);
        }

        uploadedFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
          processed: true,
          invoiceId: storedInvoice.id
        });

        processedInvoices.push({
          id: storedInvoice.id,
          merchantName: parsedInvoice.merchantName,
          totalAmount: parsedInvoice.totalAmount,
          purchaseDate: parsedInvoice.purchaseDate,
          category: parsedInvoice.category
        });

        console.log(`Successfully processed and stored invoice: ${file.name}`);

      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        
        // Store failed attempt (using the existing schema)
        const messageId = `upload-failed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const failedInvoiceData = {
          user_id: session.user.id || session.user.email, // Fallback to email if id not available
          gmail_message_id: messageId,
          merchant_name: 'Failed Upload',
          invoice_number: null,
          purchase_date: new Date().toISOString().split('T')[0],
          total_amount: 0,
          currency: 'INR',
          warranty_period: null,
          warranty_end_date: null,
          category: 'Failed Upload',
          status: 'failed' as const,
          raw_pdf_data: null,
          parsed_data: { error: error instanceof Error ? error.message : 'Unknown error' },
          source_email_id: null,
          source_email_subject: `Failed Upload: ${file.name}`,
          source_email_from: 'Manual Upload',
        };

        await supabase
          .from('invoices')
          .upsert(failedInvoiceData, {
            onConflict: 'gmail_message_id'
          });

        uploadedFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
          processed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = uploadedFiles.filter(f => f.processed).length;
    const failedCount = uploadedFiles.filter(f => !f.processed).length;

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} file(s). Processed: ${successCount}, Failed: ${failedCount}`,
      files: uploadedFiles,
      processedInvoices: processedInvoices,
      stats: {
        total: uploadedFiles.length,
        processed: successCount,
        failed: failedCount
      }
    });

  } catch (error) {
    
    return NextResponse.json({ 
      error: 'Failed to upload files' 
    }, { status: 500 });
  }
} 