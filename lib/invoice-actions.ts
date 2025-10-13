'use server';

import { parseInvoiceText, parseInvoiceFile, ParsedInvoice } from './gemini';

/**
 * Server action to parse invoice from text content
 * This can be used in forms, API calls, or other server-side operations
 */
export async function parseInvoiceFromText(text: string): Promise<{
  success: boolean;
  data?: ParsedInvoice;
  error?: string;
}> {
  try {
    if (!text.trim()) {
      return {
        success: false,
        error: 'Text content is required'
      };
    }

    const parsedInvoice = await parseInvoiceText(text);
    
    return {
      success: true,
      data: parsedInvoice
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse invoice'
    };
  }
}

/**
 * Server action to parse invoice from file buffer
 * This can be used when processing uploaded files
 */
export async function parseInvoiceFromFileBuffer(
  fileBuffer: Buffer,
  mimeType: string
): Promise<{
  success: boolean;
  data?: ParsedInvoice;
  error?: string;
}> {
  try {
    if (!fileBuffer || fileBuffer.length === 0) {
      return {
        success: false,
        error: 'File buffer is required'
      };
    }

    // Create a mock File object for the parser
    const mockFile = {
      arrayBuffer: async () => fileBuffer,
      type: mimeType,
      size: fileBuffer.length
    } as File;

    const parsedInvoice = await parseInvoiceFile(mockFile);
    
    return {
      success: true,
      data: parsedInvoice
    };
  } catch (error) {
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse invoice file'
    };
  }
}

/**
 * Server action to process Gmail email body for invoice parsing
 * This integrates with your existing Gmail setup
 */
export async function parseInvoiceFromGmail(
  emailBody: string,
  emailSubject?: string
): Promise<{
  success: boolean;
  data?: ParsedInvoice;
  error?: string;
}> {
  try {
    if (!emailBody.trim()) {
      return {
        success: false,
        error: 'Email body is required'
      };
    }

    // Enhance the text with subject if available
    let enhancedText = emailBody;
    if (emailSubject) {
      enhancedText = `Subject: ${emailSubject}\n\n${emailBody}`;
    }

    const parsedInvoice = await parseInvoiceText(enhancedText);
    
    return {
      success: true,
      data: parsedInvoice
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse invoice from email'
    };
  }
}

/**
 * Batch process multiple invoices from text content
 * Useful for processing multiple emails or documents
 */
export async function parseMultipleInvoices(
  texts: string[]
): Promise<{
  success: boolean;
  results: Array<{
    index: number;
    success: boolean;
    data?: ParsedInvoice;
    error?: string;
  }>;
}> {
  const results = [];
  
  for (let i = 0; i < texts.length; i++) {
    try {
      const parsedInvoice = await parseInvoiceText(texts[i]);
      results.push({
        index: i,
        success: true,
        data: parsedInvoice
      });
    } catch (error) {
      results.push({
        index: i,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse invoice'
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  
  return {
    success: successCount > 0,
    results
  };
}

/**
 * Validate parsed invoice data
 * Useful for ensuring data quality before saving to database
 */
export function validateParsedInvoice(invoice: ParsedInvoice): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!invoice.vendor || invoice.vendor.trim() === '') {
    errors.push('Vendor name is required');
  }

  if (!invoice.invoiceNumber || invoice.invoiceNumber.trim() === '') {
    errors.push('Invoice number is required');
  }

  if (invoice.total < 0) {
    errors.push('Total amount cannot be negative');
  }

  if (invoice.taxes < 0) {
    errors.push('Tax amount cannot be negative');
  }

  if (invoice.items.length === 0) {
    errors.push('At least one item is required');
  }

  // Validate items
  invoice.items.forEach((item, index) => {
    if (!item.name || item.name.trim() === '') {
      errors.push(`Item ${index + 1}: Name is required`);
    }
    if (item.quantity <= 0) {
      errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
    }
    if (item.price < 0) {
      errors.push(`Item ${index + 1}: Price cannot be negative`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}
