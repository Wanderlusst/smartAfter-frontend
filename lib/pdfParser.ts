import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { GmailAttachment } from './gmailService';

// Types for invoice data
export interface InvoiceItem {
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  price: number;
  category: string;
}

export interface Address {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface ParsedInvoice {
  merchantName: string;
  invoiceNumber: string;
  purchaseDate: string;
  totalAmount: number;
  subtotal: number;
  taxes: number;
  shipping: number;
  discount: number;
  currency: string;
  warrantyPeriod?: number; // in days
  warrantyEndDate?: string;
  category: string;
  items: InvoiceItem[];
  billingAddress: Address;
  shippingAddress: Address;
  paymentMethod: string;
  orderNumber: string;
  poNumber: string;
  dueDate: string;
  notes: string;
  confidence: number; // 0-100, how confident we are in the parsing
}

export interface ParsingResult {
  success: boolean;
  data?: ParsedInvoice;
  error?: string;
  rawText?: string;
  processingTime: number;
}

// Gemini model configuration
let geminiModel: GenerativeModel | null = null;

function getGeminiModel(): GenerativeModel {
  if (!geminiModel) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  }
  return geminiModel;
}

// Enhanced prompt for invoice parsing with warranty detection
const INVOICE_PARSE_PROMPT = `You are an expert invoice parser specializing in extracting structured data from invoices and receipts. Your task is to extract comprehensive information including warranty details.

IMPORTANT RULES:
- Return ONLY valid JSON in the exact format specified below
- No additional text, explanations, or markdown formatting
- All monetary values must be numbers (not strings)
- Dates must be in YYYY-MM-DD format
- If a field is not found, use null or empty string as appropriate
- Be precise with merchant names and invoice numbers
- Look for warranty information in the document
- Set confidence score based on data quality (0-100)

Required JSON format:
{
  "merchantName": "string",
  "invoiceNumber": "string", 
  "purchaseDate": "YYYY-MM-DD",
  "totalAmount": number,
  "subtotal": number,
  "taxes": number,
  "shipping": number,
  "discount": number,
  "currency": "string",
  "warrantyPeriod": number (in days, null if not found),
  "warrantyEndDate": "YYYY-MM-DD" (null if not found),
  "category": "string" (Electronics, Fashion, Food, etc.),
  "items": [
    {
      "name": "string",
      "description": "string",
      "quantity": number,
      "unitPrice": number,
      "price": number,
      "category": "string"
    }
  ],
  "billingAddress": {
    "name": "string",
    "address": "string",
    "city": "string",
    "state": "string",
    "zipCode": "string",
    "country": "string"
  },
  "shippingAddress": {
    "name": "string",
    "address": "string",
    "city": "string",
    "state": "string",
    "zipCode": "string",
    "country": "string"
  },
  "paymentMethod": "string",
  "orderNumber": "string",
  "poNumber": "string",
  "dueDate": "YYYY-MM-DD",
  "notes": "string",
  "confidence": number
}

Parse the following document:`;

export class PDFParser {
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  /**
   * Parse PDF attachment from Gmail
   */
  async parsePDFAttachment(
    attachment: GmailAttachment,
    pdfData: Buffer,
    emailContext?: { subject: string; from: string; body: string }
  ): Promise<ParsingResult> {
    const startTime = Date.now();
    
    try {

      // Convert PDF to base64
      const base64Data = pdfData.toString('base64');
      
      // Try AI parsing first
      const aiResult = await this.parseWithAI(base64Data, attachment.mimeType, emailContext);
      
      if (aiResult.success && aiResult.data) {
        const processingTime = Date.now() - startTime;
        
        return {
          success: true,
          data: aiResult.data,
          processingTime
        };
      }

      // Fallback to text extraction if AI fails
      
      const textResult = await this.parseWithTextExtraction(pdfData, emailContext);
      
      const processingTime = Date.now() - startTime;
      return {
        success: textResult.success,
        data: textResult.data,
        error: textResult.error,
        rawText: textResult.rawText,
        processingTime
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      return {
        success: false,
        error: error.message,
        processingTime
      };
    }
  }

  /**
   * Parse PDF using Gemini AI
   */
  private async parseWithAI(
    base64Data: string,
    mimeType: string,
    emailContext?: { subject: string; from: string; body: string }
  ): Promise<{ success: boolean; data?: ParsedInvoice; error?: string }> {
    try {
      const model = getGeminiModel();
      
      // Enhance prompt with email context if available
      let enhancedPrompt = INVOICE_PARSE_PROMPT;
      if (emailContext) {
        enhancedPrompt += `\n\nEmail Context:
Subject: ${emailContext.subject}
From: ${emailContext.from}
Body Preview: ${emailContext.body.substring(0, 500)}...`;
      }
      
      const result = await model.generateContent([
        enhancedPrompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        }
      ]);
      
      const response = await result.response;
      const textResponse = response.text();

      // Extract JSON from response
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from AI response');
      }
      
      const parsedData = JSON.parse(jsonMatch[0]);
      
      // Validate and enhance the parsed data
      const validatedData = this.validateAndEnhanceInvoiceData(parsedData, emailContext);
      
      return {
        success: true,
        data: validatedData
      };
      
    } catch (error: any) {
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fallback text extraction parsing
   */
  private async parseWithTextExtraction(
    pdfData: Buffer,
    emailContext?: { subject: string; from: string; body: string }
  ): Promise<{ success: boolean; data?: ParsedInvoice; error?: string; rawText?: string }> {
    try {
      // For now, we'll use a simple text extraction approach
      // In production, you might want to use a proper PDF parsing library
      const rawText = this.extractTextFromPDF(pdfData);
      
      if (!rawText || rawText.length < 50) {
        return {
          success: false,
          error: 'No readable text found in PDF',
          rawText
        };
      }

      // Parse using regex patterns
      const parsedData = this.parseTextWithPatterns(rawText, emailContext);
      
      return {
        success: true,
        data: parsedData,
        rawText
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract text from PDF (simplified implementation)
   */
  private extractTextFromPDF(pdfData: Buffer): string {
    // This is a simplified text extraction
    // In production, you'd use a proper PDF parsing library like pdf-parse
    try {
      // Convert buffer to string and extract readable text
      const text = pdfData.toString('utf-8');
      
      // Remove binary data and keep only readable characters
      const cleanText = text.replace(/[^\x20-\x7E\s]/g, ' ').replace(/\s+/g, ' ');
      
      return cleanText.substring(0, 5000); // Limit to first 5000 characters
    } catch (error) {
      
      return '';
    }
  }

  /**
   * Parse text using regex patterns (fallback method)
   */
  private parseTextWithPatterns(
    text: string,
    emailContext?: { subject: string; from: string; body: string }
  ): ParsedInvoice {

    // Extract amount
    const amountPatterns = [
      /total[:\s]*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
      /amount[:\s]*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
      /grand\s*total[:\s]*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
      /₹\s*([1-9][0-9,]+(?:\.[0-9]{1,2})?)/g,
    ];

    let totalAmount = 0;
    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        const numericMatch = match[0].match(/([0-9,]+(?:\.[0-9]{1,2})?)/);
        if (numericMatch) {
          const amount = parseFloat(numericMatch[1].replace(/,/g, ''));
          if (amount > totalAmount) {
            totalAmount = amount;
          }
        }
      }
    }

    // Extract merchant name
    let merchantName = 'Unknown Merchant';
    if (emailContext?.from) {
      merchantName = emailContext.from.split('<')[0].trim().replace(/"/g, '');
    }

    // Extract date
    const datePatterns = [
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/,
      /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/,
    ];

    let purchaseDate = new Date().toISOString().split('T')[0];
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const parsedDate = new Date(match[1]);
          if (!isNaN(parsedDate.getTime())) {
            purchaseDate = parsedDate.toISOString().split('T')[0];
            break;
          }
        } catch (e) {
          // Continue to next pattern
        }
      }
    }

    // Extract invoice number
    const invoicePatterns = [
      /invoice\s*(?:no\.?|number|#)?\s*:?\s*([A-Z0-9\-]+)/i,
      /order\s*(?:no\.?|number|#)?\s*:?\s*([A-Z0-9\-]+)/i,
      /receipt\s*(?:no\.?|number|#)?\s*:?\s*([A-Z0-9\-]+)/i,
    ];

    let invoiceNumber = '';
    for (const pattern of invoicePatterns) {
      const match = text.match(pattern);
      if (match) {
        invoiceNumber = match[1];
        break;
      }
    }

    // Determine category based on merchant or content
    const category = this.determineCategory(merchantName, text);

    return {
      merchantName,
      invoiceNumber,
      purchaseDate,
      totalAmount,
      subtotal: totalAmount * 0.9,
      taxes: totalAmount * 0.1,
      shipping: 0,
      discount: 0,
      currency: 'INR',
      category,
      items: [{
        name: 'Parsed Item',
        description: 'Extracted from PDF content',
        quantity: 1,
        unitPrice: totalAmount,
        price: totalAmount,
        category
      }],
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
      paymentMethod: 'Unknown',
      orderNumber: invoiceNumber,
      poNumber: '',
      dueDate: '',
      notes: 'Parsed using pattern-based extraction',
      confidence: totalAmount > 0 ? 70 : 30
    };
  }

  /**
   * Determine category based on merchant name and content
   */
  private determineCategory(merchantName: string, text: string): string {
    const merchantLower = merchantName.toLowerCase();
    const textLower = text.toLowerCase();

    if (merchantLower.includes('swiggy') || merchantLower.includes('zomato') || textLower.includes('food')) {
      return 'Food & Dining';
    }
    if (merchantLower.includes('amazon') || merchantLower.includes('flipkart') || textLower.includes('electronics')) {
      return 'Electronics';
    }
    if (merchantLower.includes('myntra') || textLower.includes('fashion') || textLower.includes('clothing')) {
      return 'Fashion';
    }
    if (merchantLower.includes('uber') || merchantLower.includes('ola') || textLower.includes('transport')) {
      return 'Transportation';
    }
    if (merchantLower.includes('bookmyshow') || textLower.includes('movie') || textLower.includes('entertainment')) {
      return 'Entertainment';
    }

    return 'Other';
  }

  /**
   * Validate and enhance parsed invoice data
   */
  private validateAndEnhanceInvoiceData(
    data: any,
    emailContext?: { subject: string; from: string; body: string }
  ): ParsedInvoice {
    // Ensure required fields exist with proper types
    const validated: ParsedInvoice = {
      merchantName: String(data.merchantName || 'Unknown Merchant'),
      invoiceNumber: String(data.invoiceNumber || ''),
      purchaseDate: String(data.purchaseDate || ''),
      totalAmount: Number(data.totalAmount) || 0,
      subtotal: Number(data.subtotal) || 0,
      taxes: Number(data.taxes) || 0,
      shipping: Number(data.shipping) || 0,
      discount: Number(data.discount) || 0,
      currency: String(data.currency || 'INR'),
      warrantyPeriod: data.warrantyPeriod ? Number(data.warrantyPeriod) : undefined,
      warrantyEndDate: data.warrantyEndDate ? String(data.warrantyEndDate) : undefined,
      category: String(data.category || 'Other'),
      items: Array.isArray(data.items) ? data.items.map((item: any) => ({
        name: String(item.name || 'Unknown Item'),
        description: String(item.description || ''),
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        price: Number(item.price) || 0,
        category: String(item.category || 'Other')
      })) : [],
      billingAddress: {
        name: String(data.billingAddress?.name || ''),
        address: String(data.billingAddress?.address || ''),
        city: String(data.billingAddress?.city || ''),
        state: String(data.billingAddress?.state || ''),
        zipCode: String(data.billingAddress?.zipCode || ''),
        country: String(data.billingAddress?.country || '')
      },
      shippingAddress: {
        name: String(data.shippingAddress?.name || ''),
        address: String(data.shippingAddress?.address || ''),
        city: String(data.shippingAddress?.city || ''),
        state: String(data.shippingAddress?.state || ''),
        zipCode: String(data.shippingAddress?.zipCode || ''),
        country: String(data.shippingAddress?.country || '')
      },
      paymentMethod: String(data.paymentMethod || ''),
      orderNumber: String(data.orderNumber || ''),
      poNumber: String(data.poNumber || ''),
      dueDate: String(data.dueDate || ''),
      notes: String(data.notes || ''),
      confidence: Number(data.confidence) || 50
    };

    // Validate date format
    if (validated.purchaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(validated.purchaseDate)) {
      validated.purchaseDate = '';
    }

    // Calculate warranty end date if warranty period is provided
    if (validated.warrantyPeriod && validated.purchaseDate) {
      const purchaseDate = new Date(validated.purchaseDate);
      const warrantyEndDate = new Date(purchaseDate);
      warrantyEndDate.setDate(warrantyEndDate.getDate() + validated.warrantyPeriod);
      validated.warrantyEndDate = warrantyEndDate.toISOString().split('T')[0];
    }

    // Ensure monetary values are positive
    validated.totalAmount = Math.max(0, validated.totalAmount);
    validated.subtotal = Math.max(0, validated.subtotal);
    validated.taxes = Math.max(0, validated.taxes);
    validated.shipping = Math.max(0, validated.shipping);
    validated.discount = Math.max(0, validated.discount);

    // Ensure item prices are positive
    validated.items = validated.items.map(item => ({
      ...item,
      price: Math.max(0, item.price),
      quantity: Math.max(1, item.quantity)
    }));

    // Enhance merchant name from email context if available
    if (emailContext?.from && validated.merchantName === 'Unknown Merchant') {
      validated.merchantName = emailContext.from.split('<')[0].trim().replace(/"/g, '');
    }

    return validated;
  }

  /**
   * Test the Gemini connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const model = getGeminiModel();
      const testPrompt = 'Hello, this is a test message. Please respond with "Hello back!"';
      
      const result = await model.generateContent(testPrompt);
      const response = await result.response;
      const textResponse = response.text();

      return true;
    } catch (error) {
      
      return false;
    }
  }
}

/**
 * Factory function to create PDF parser instance
 */
export function createPDFParser(): PDFParser {
  return new PDFParser();
}

/**
 * Quick function to parse a PDF attachment
 */
export async function parsePDFAttachment(
  attachment: GmailAttachment,
  pdfData: Buffer,
  emailContext?: { subject: string; from: string; body: string }
): Promise<ParsingResult> {
  const parser = createPDFParser();
  return parser.parsePDFAttachment(attachment, pdfData, emailContext);
}
