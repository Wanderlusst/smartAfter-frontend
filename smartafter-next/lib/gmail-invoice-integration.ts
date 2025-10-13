import { parseInvoiceFile, parseInvoiceText, ParsedInvoice, parseInvoiceWithFallback } from './gemini';
import { getGmailClient } from './gmail';

/**
 * Enhanced PDF text extraction function
 */
async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {

    // Convert PDF buffer to string and look for text patterns
    const bufferString = pdfBuffer.toString('latin1');
    
    // Enhanced PDF text extraction patterns
    const textPatterns = [
      // Look for text between parentheses (common in PDFs)
      /\(([^)]+)\)/g,
      // Look for text after "Tj" operators (PDF text showing)
      /\s([^\r\n\s]+)\s+Tj/g,
      // Look for visible text patterns
      /[A-Za-z0-9\s₹$€.,:-]+/g,
      // Look for amount patterns specifically
      /₹\s*[\d,]+\.?\d*/g,
      /Total[:\s]*₹\s*[\d,]+\.?\d*/gi,
      /Amount[:\s]*₹\s*[\d,]+\.?\d*/gi
    ];
    
    let extractedText = '';
    const foundTexts = new Set(); // Avoid duplicates
    
    // Extract text using all patterns
    for (const pattern of textPatterns) {
      const matches = bufferString.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleanMatch = match.replace(/[()]/g, '').trim();
          if (cleanMatch.length > 2 && !foundTexts.has(cleanMatch)) {
            foundTexts.add(cleanMatch);
            extractedText += cleanMatch + ' ';
          }
        });
      }
    }
    
    // If we couldn't extract much, try raw text approach
    if (extractedText.length < 100) {
      
      // Look for readable ASCII text in the PDF
      const readableText = bufferString.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ');
      extractedText = readableText.substring(0, 2000); // Limit to prevent huge logs
    }

    return extractedText.trim();
  } catch (error) {
    
    return '';
  }
}

/**
 * Enhanced Gmail invoice integration using Gemini LLM
 * This module automatically analyzes PDF attachments and email content
 * to extract structured invoice data
 */

export interface GmailInvoiceData {
  messageId: string;
  subject: string;
  from: string;
  date: string;
  parsedInvoice: ParsedInvoice;
  attachmentCount: number;
  pdfAttachments: string[];
  confidence: number;
  source: 'pdf' | 'email' | 'hybrid';
}

/**
 * Extract and analyze invoices from Gmail messages
 */
export async function analyzeGmailInvoices(messageIds: string[]): Promise<GmailInvoiceData[]> {
  try {
    
    const gmail = await getGmailClient();
    const results: GmailInvoiceData[] = [];

    for (const messageId of messageIds) {
      try {
        
        const invoiceData = await analyzeSingleGmailInvoice(gmail, messageId);
        if (invoiceData) {
          results.push(invoiceData);
        }
      } catch (error) {
        
        continue;
      }
    }

    return results;
  } catch (error) {
    
    throw error;
  }
}

/**
 * Analyze a single Gmail message for invoice data
 */
async function analyzeSingleGmailInvoice(gmail: any, messageId: string): Promise<GmailInvoiceData | null> {
  try {
    // Get full message with attachments
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    const message = response.data;
    const headers = message.payload?.headers || [];
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
    const from = headers.find((h: any) => h.name === 'From')?.value || '';
    const date = headers.find((h: any) => h.name === 'Date')?.value || '';

    // Check if this looks like an invoice email
    if (!isInvoiceEmail(subject, from)) {

      return null;
    }

    // Extract text content from email body
    const emailBody = extractEmailBody(message.payload);

    // Find PDF attachments
    const pdfAttachments = await extractPdfAttachments(gmail, messageId, message.payload);

    let parsedInvoice: ParsedInvoice;
    let source: 'pdf' | 'email' | 'hybrid' = 'email';
    let confidence = 0.5;

    if (pdfAttachments.length > 0) {
      // Try to parse from PDF first (highest confidence)
      try {
        
        const pdfBuffer = Buffer.from(pdfAttachments[0], 'base64');
        
        // ENHANCED: Extract text from PDF for debugging
        const pdfText = await extractTextFromPDF(pdfBuffer);

        // Log what we're trying to parse

        // Use enhanced PDF text parsing instead of disabled Gemini
        if (pdfText && pdfText.length > 50) {
          
          parsedInvoice = await parseInvoiceWithFallback(pdfText);
        } else {
          
          parsedInvoice = await parseInvoiceWithFallback(emailBody);
        }
        
        source = 'pdf';
        confidence = 0.9;
        
      } catch (pdfError) {
        
        // Fall back to email text analysis
        parsedInvoice = await parseInvoiceWithFallback(emailBody);
        source = 'email';
        confidence = 0.7;
      }
    } else {
      // Parse from email text only

      try {
        
        parsedInvoice = await parseInvoiceText(emailBody);
        source = 'email';
        confidence = 0.6;
        
      } catch (aiError) {

        // Enhanced fallback parsing using email body + subject
        const fullTextContent = `${subject} ${emailBody}`;
        
        const extractedAmount = extractAmountFromFullText(fullTextContent);
        const extractedVendor = extractVendorFromEmail(from, subject) || extractVendorFromText(fullTextContent);

        parsedInvoice = {
          vendor: extractedVendor || 'Unknown Vendor',
          total: extractedAmount,
          subtotal: extractedAmount * 0.9, // Estimate 90% as subtotal
          taxes: extractedAmount * 0.1, // Estimate 10% as taxes
          shipping: 0,
          invoiceNumber: extractInvoiceNumberFromSubject(subject) || extractInvoiceNumberFromText(fullTextContent) || '',
          orderNumber: extractOrderNumberFromSubject(subject) || extractOrderNumberFromText(fullTextContent) || '',
          date: new Date().toISOString(),
          dueDate: '',
          items: extractedAmount > 0 ? [{
            name: 'Extracted Item',
            description: 'Item extracted from email content',
            quantity: 1,
            unitPrice: extractedAmount,
            price: extractedAmount,
            category: 'Other'
          }] : [],
          paymentMethod: 'Online',
          notes: 'Enhanced fallback parsing (Gemini disabled)',
          discount: 0,
          currency: 'INR',
          billingAddress: {
            name: '',
            address: '',
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
          poNumber: ''
        };
        source = 'email';
        confidence = extractedAmount > 0 ? 0.7 : 0.3;

      }
    }

    // Enhance with email metadata
    const enhancedInvoice = enhanceInvoiceWithEmailData(parsedInvoice, {
      subject,
      from,
      date,
      messageId
    });

    return {
      messageId,
      subject,
      from,
      date,
      parsedInvoice: enhancedInvoice,
      attachmentCount: pdfAttachments.length,
      pdfAttachments: pdfAttachments.map(() => 'PDF attachment'),
      confidence,
      source
    };

  } catch (error) {
    
    return null;
  }
}

/**
 * Check if an email is likely to contain invoice information
 * Enhanced to be less restrictive and catch more invoice emails
 */
function isInvoiceEmail(subject: string, from: string): boolean {
  const subjectLower = subject.toLowerCase();
  const fromLower = from.toLowerCase();

  // Expanded invoice keywords
  const invoiceKeywords = [
    'invoice', 'receipt', 'bill', 'payment', 'transaction',
    'order', 'purchase', 'confirmation', 'thank you for your order',
    'delivery', 'shipped', 'out for delivery', 'order confirmed',
    'payment successful', 'payment received', 'order placed',
    'booking', 'reservation', 'subscription', 'renewal',
    'charge', 'debit', 'credit', 'refund', 'cancellation',
    'ticket', 'voucher', 'coupon', 'discount', 'offer',
    'statement', 'summary', 'report', 'notification'
  ];

  // Expanded vendor domains and patterns
  const vendorPatterns = [
    'amazon', 'flipkart', 'myntra', 'swiggy', 'zomato',
    'uber', 'ola', 'paytm', 'razorpay', 'bookmyshow',
    'netflix', 'primevideo', 'hotstar', 'spotify',
    'gmail', 'noreply', 'no-reply', 'support', 'billing',
    'orders', 'payments', 'transactions', 'notifications'
  ];

  // Check subject for invoice keywords
  const hasInvoiceKeywords = invoiceKeywords.some(keyword => 
    subjectLower.includes(keyword)
  );

  // Check sender domain for known vendors or patterns
  const hasVendorPattern = vendorPatterns.some(pattern => 
    fromLower.includes(pattern)
  );

  // Check for amount patterns in subject (more flexible)
  const hasAmountPattern = /₹\s*\d+|\d+\s*rupees?|\d+\s*inr|\$\s*\d+|\d+\s*dollars?/i.test(subject);

  // Check for common email patterns that indicate invoices
  const hasEmailPattern = /order|purchase|payment|invoice|receipt|bill/i.test(subject);

  // More lenient approach - if it has any financial indicators, consider it
  const hasFinancialIndicators = hasAmountPattern || hasEmailPattern;

  return hasInvoiceKeywords || hasVendorPattern || hasFinancialIndicators;
}

/**
 * Extract text content from email body
 */
function extractEmailBody(payload: any): string {
  let bodyText = '';

  function extractFromPart(part: any) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      const text = Buffer.from(part.body.data, 'base64').toString('utf-8');
      bodyText += text + '\n';
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      // Convert HTML to plain text (basic conversion)
      const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
      const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      bodyText += text + '\n';
    }

    if (part.parts) {
      part.parts.forEach(extractFromPart);
    }
  }

  if (payload.parts) {
    payload.parts.forEach(extractFromPart);
  } else if (payload.body?.data) {
    const text = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    bodyText = text;
  }

  return bodyText.trim();
}

/**
 * Extract PDF attachments from Gmail message
 */
async function extractPdfAttachments(gmail: any, messageId: string, payload: any): Promise<string[]> {
  const pdfData: string[] = [];

  async function extractFromPart(part: any) {
    if (part.mimeType === 'application/pdf' && part.body?.attachmentId) {
      try {

        const attachment = await gmail.users.messages.attachments.get({
          userId: 'me',
          messageId: messageId,
          id: part.body.attachmentId,
        });

        if (attachment.data.body?.data) {
          pdfData.push(attachment.data.body.data);
          
        }
      } catch (error) {
        
      }
    }

    if (part.parts) {
      for (const subPart of part.parts) {
        await extractFromPart(subPart);
      }
    }
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      await extractFromPart(part);
    }
  }

  return pdfData;
}

/**
 * Enhance parsed invoice with email metadata
 */
function enhanceInvoiceWithEmailData(invoice: ParsedInvoice, emailData: {
  subject: string;
  from: string;
  date: string;
  messageId: string;
}): ParsedInvoice {
  // If vendor is not found in invoice, try to extract from email
  if (!invoice.vendor || invoice.vendor === 'Unknown Vendor') {
    const vendorFromEmail = extractVendorFromEmail(emailData.from, emailData.subject);
    if (vendorFromEmail) {
      invoice.vendor = vendorFromEmail;
    }
  }

  // If invoice number is not found, try to extract from subject
  if (!invoice.invoiceNumber || invoice.invoiceNumber === 'Unknown') {
    const invoiceNumberFromSubject = extractInvoiceNumberFromSubject(emailData.subject);
    if (invoiceNumberFromSubject) {
      invoice.invoiceNumber = invoiceNumberFromSubject;
    }
  }

  // Add email metadata as notes
  if (!invoice.notes) {
    invoice.notes = `Extracted from email: ${emailData.subject}`;
  }

  return invoice;
}

/**
 * Extract vendor name from email sender or subject
 */
function extractVendorFromEmail(from: string, subject: string): string | null {
  // Common vendor patterns
  const vendorPatterns = [
    /from:\s*"?([^"<]+)"?/i,
    /"?([^"<]+)"?\s*</i,
    /([a-zA-Z0-9\s]+)\s*<[^>]+>/i
  ];

  for (const pattern of vendorPatterns) {
    const match = from.match(pattern);
    if (match && match[1]) {
      const vendor = match[1].trim();
      if (vendor && vendor !== 'noreply' && vendor !== 'no-reply') {
        return vendor;
      }
    }
  }

  // Try to extract from subject
  const subjectVendors = ['Amazon', 'Flipkart', 'Myntra', 'Swiggy', 'Zomato', 'Uber', 'Ola'];
  for (const vendor of subjectVendors) {
    if (subject.toLowerCase().includes(vendor.toLowerCase())) {
      return vendor;
    }
  }

  return null;
}

/**
 * Extract invoice number from email subject
 */
function extractInvoiceNumberFromSubject(subject: string): string | null {
  const patterns = [
    /invoice\s*#?\s*([A-Z0-9-]+)/i,
    /order\s*#?\s*([A-Z0-9-]+)/i,
    /receipt\s*#?\s*([A-Z0-9-]+)/i,
    /transaction\s*#?\s*([A-Z0-9-]+)/i,
    /([A-Z0-9]{8,})/ // Generic pattern for long alphanumeric strings
  ];

  for (const pattern of patterns) {
    const match = subject.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Extract order number from email subject
 */
function extractOrderNumberFromSubject(subject: string): string | null {
  const patterns = [
    /order\s*#?\s*([A-Z0-9-]+)/i,
    /([A-Z0-9]{8,})/ // Generic pattern for long alphanumeric strings
  ];

  for (const pattern of patterns) {
    const match = subject.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Extract amount from email subject
 */
function extractAmountFromSubject(subject: string): number | null {
  const patterns = [
    /₹\s*(\d+(?:,\d+)?(?:\.\d+)?)/i, // ₹1,234.56 or ₹1,234.56
    /(\d+(?:,\d+)?(?:\.\d+)?)\s*rupees?/i, // 1,234.56 rupees or 1,234.56 rupees
    /(\d+(?:,\d+)?(?:\.\d+)?)\s*inr/i // 1,234.56 inr or 1,234.56 inr
  ];

  for (const pattern of patterns) {
    const match = subject.match(pattern);
    if (match && match[1]) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amount)) {
        return amount;
      }
    }
  }

  return null;
}

/**
 * Batch process multiple Gmail messages for invoice analysis
 */
export async function batchAnalyzeGmailInvoices(messageIds: string[], batchSize: number = 5): Promise<GmailInvoiceData[]> {
  const results: GmailInvoiceData[] = [];
  
  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize);

    try {
      const batchResults = await analyzeGmailInvoices(batch);
      results.push(...batchResults);
      
      // Add delay between batches to avoid rate limiting
      if (i + batchSize < messageIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      
      continue;
    }
  }
  
  return results;
}

/**
 * Get invoice summary statistics
 */
export function getInvoiceSummary(invoices: GmailInvoiceData[]) {
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.parsedInvoice.total, 0);
  const vendorCounts = invoices.reduce((acc, inv) => {
    acc[inv.parsedInvoice.vendor] = (acc[inv.parsedInvoice.vendor] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const sourceBreakdown = invoices.reduce((acc, inv) => {
    acc[inv.source] = (acc[inv.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalInvoices: invoices.length,
    totalAmount,
    averageAmount: totalAmount / invoices.length,
    vendorCounts,
    sourceBreakdown,
    averageConfidence: invoices.reduce((sum, inv) => sum + inv.confidence, 0) / invoices.length
  };
}

/**
 * Enhanced amount extraction from full email text
 */
function extractAmountFromFullText(text: string): number {
  if (!text) return 0;
  
  // Enhanced amount extraction patterns
  const amountPatterns = [
    // Direct currency patterns
    /₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/g,
    /INR\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /Rs\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /\$\s*([0-9,]+(?:\.[0-9]{1,2})?)/g,
    
    // Contextual patterns
    /total[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /amount[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /grand\s*total[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /paid[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /subtotal[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /bill[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /price[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /cost[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /worth[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /balance\s*due[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    
    // Loose patterns
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*rupees?/gi,
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*inr/gi,
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*rs\.?/gi,
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*\/-/gi,
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*only/gi,
  ];
  
  let bestAmount = 0;
  
  // Find the highest amount (likely the total)
  for (const pattern of amountPatterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      // Extract numeric value
      const numericMatch = match[0].match(/([0-9,]+(?:\.[0-9]{1,2})?)/);
      if (numericMatch) {
        const amount = numericMatch[1].replace(/,/g, '');
        const numAmount = parseFloat(amount);
        if (!isNaN(numAmount) && numAmount > bestAmount) {
          bestAmount = numAmount;
        }
      }
    }
  }
  
  return bestAmount;
}

/**
 * Extract vendor name from email text
 */
function extractVendorFromText(text: string): string | null {
  const vendorPatterns = [
    /from\s+([^<\n,]+)/i,
    /by\s+([^<\n,]+)/i,
    /at\s+([^<\n,]+)/i,
    /thank\s+you\s+for\s+shopping\s+with\s+([^<\n,.!]+)/i,
    /your\s+order\s+from\s+([^<\n,]+)/i,
    /receipt\s+from\s+([^<\n,]+)/i,
  ];
  
  for (const pattern of vendorPatterns) {
    const match = text.match(pattern);
    if (match) {
      const vendor = match[1].trim().replace(/[<>]/g, '');
      if (vendor.length > 2 && vendor.length < 50) {
        return vendor;
      }
    }
  }
  
  return null;
}

/**
 * Extract invoice number from email text
 */
function extractInvoiceNumberFromText(text: string): string | null {
  const invoicePatterns = [
    /invoice\s*(?:no\.?|number|#)?\s*:?\s*([A-Z0-9\-]+)/i,
    /order\s*(?:no\.?|number|#)?\s*:?\s*([A-Z0-9\-]+)/i,
    /receipt\s*(?:no\.?|number|#)?\s*:?\s*([A-Z0-9\-]+)/i,
    /transaction\s*(?:no\.?|number|#)?\s*:?\s*([A-Z0-9\-]+)/i,
    /reference\s*(?:no\.?|number|#)?\s*:?\s*([A-Z0-9\-]+)/i,
  ];
  
  for (const pattern of invoicePatterns) {
    const match = text.match(pattern);
    if (match) {
      const number = match[1].trim();
      if (number.length > 3 && number.length < 30) {
        return number;
      }
    }
  }
  
  return null;
}

/**
 * Extract order number from email text
 */
function extractOrderNumberFromText(text: string): string | null {
  const orderPatterns = [
    /order\s*(?:no\.?|number|#|id)?\s*:?\s*([A-Z0-9\-]+)/i,
    /order\s*id[:\s]*([A-Z0-9\-]+)/i,
    /booking\s*(?:no\.?|number|#|id)?\s*:?\s*([A-Z0-9\-]+)/i,
    /confirmation\s*(?:no\.?|number|#)?\s*:?\s*([A-Z0-9\-]+)/i,
  ];
  
  for (const pattern of orderPatterns) {
    const match = text.match(pattern);
    if (match) {
      const number = match[1].trim();
      if (number.length > 3 && number.length < 30) {
        return number;
      }
    }
  }
  
  return null;
}
