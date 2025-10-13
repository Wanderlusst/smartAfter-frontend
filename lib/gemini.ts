import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

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
  vendor: string;
  invoiceNumber: string;
  date: string;
  total: number;
  subtotal: number;
  taxes: number;
  shipping: number;
  discount: number;
  currency: string;
  items: InvoiceItem[];
  billingAddress: Address;
  shippingAddress: Address;
  paymentMethod: string;
  orderNumber: string;
  poNumber: string;
  dueDate: string;
  notes: string;
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
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }
  return geminiModel;
}

// Smart prompt for invoice parsing
const INVOICE_PARSE_PROMPT = `You are an expert invoice parser. Extract structured data from the provided invoice and return ONLY valid JSON in the exact format specified below.

IMPORTANT: 
- Return ONLY the JSON object, no additional text, explanations, or markdown
- Ensure all monetary values are numbers (not strings)
- Ensure dates are in YYYY-MM-DD format
- If a field is not found, use null or empty string as appropriate
- Be precise with vendor names and invoice numbers

Required JSON format:
{
  "vendor": "string",
  "invoiceNumber": "string", 
  "date": "YYYY-MM-DD",
  "total": number,
  "taxes": number,
  "items": [
    {
      "name": "string",
      "quantity": number,
      "price": number
    }
  ]
}

Parse the following invoice:`;

// Removed rate limiting - direct API calls

/**
 * Parse invoice from text content (e.g., Gmail body)
 */
export async function parseInvoiceText(text: string): Promise<ParsedInvoice> {
  // TEMPORARILY DISABLED: Gemini integration due to quota limits

  /*
  try {

    const model = getGeminiModel();
    
    const prompt = `${INVOICE_PARSE_PROMPT}\n\nInvoice Text:\n${text}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textResponse = response.text();

    // Clean the response to extract just the JSON
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Gemini response');
    }
    
    const parsedData = JSON.parse(jsonMatch[0]);
    
    // Validate the parsed data structure
    const validatedData = validateInvoiceData(parsedData);
    
    return validatedData;
    
  } catch (error) {
    
    throw error;
  }
  */
  
  // Use enhanced fallback parsing instead
  return parseInvoiceWithFallback(text);
}

/**
 * Parse invoice from file (image or PDF)
 */
export async function parseInvoiceFile(file: File | Buffer): Promise<ParsedInvoice> {
  try {
    // Check if Gemini API key is available
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log('⚠️ GEMINI_API_KEY not set, using fallback parsing');
      return parseInvoiceWithFallback(`File: ${Buffer.isBuffer(file) ? 'Buffer' : file.name}`);
    }

    const model = getGeminiModel();
    
    // Convert file to base64 if it's a Buffer
    let fileData: string;
    let mimeType: string;
    
    if (Buffer.isBuffer(file)) {
      fileData = file.toString('base64');
      mimeType = 'application/octet-stream'; // Default for unknown file types
    } else {
      // Handle File object (from form uploads)
      const arrayBuffer = await file.arrayBuffer();
      fileData = Buffer.from(arrayBuffer).toString('base64');
      mimeType = file.type;
    }
    
    const prompt = `${INVOICE_PARSE_PROMPT}\n\nFile content (${mimeType}):`;
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: fileData,
          mimeType: mimeType
        }
      }
    ]);
    
    const response = await result.response;
    const textResponse = response.text();
    
    console.log('🤖 Gemini response:', textResponse.substring(0, 200) + '...');

    // Clean the response to extract just the JSON
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Gemini response');
    }
    
    const parsedData = JSON.parse(jsonMatch[0]);
    
    // Validate the parsed data structure
    const validatedData = validateInvoiceData(parsedData);
    
    return validatedData;
  } catch (error) {
    console.error('❌ Gemini parsing failed:', error);
    console.log('🔄 Falling back to basic parsing...');
    
    // Return basic file parsing fallback
    const fileName = Buffer.isBuffer(file) ? 'Unknown File' : file.name;
    return parseInvoiceWithFallback(`File: ${fileName}`);
  }
}

/**
 * Create empty invoice for invalid data
 */
function createEmptyInvoice(): ParsedInvoice {
  return {
    vendor: 'Invalid',
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
    notes: 'Invalid email - no purchase data found'
  };
}

/**
 * Enhanced fallback parsing without Gemini
 */
export function parseInvoiceWithFallback(text: string): ParsedInvoice {

  // Check if email contains purchase indicators
  const purchaseIndicators = [
    'order', 'purchase', 'payment', 'invoice', 'receipt', 'total paid', 'amount paid',
    'transaction', 'delivery', 'confirmed', 'shipped', 'order id', 'receipt'
  ];
  
  const hasValidContent = purchaseIndicators.some(indicator => 
    text.toLowerCase().includes(indicator)
  );
  
  if (!hasValidContent) {
    
    return createEmptyInvoice();
  }
  
  // STRICT amount patterns - only contextual amounts
  const amountPatterns = [
    // Only highly contextual patterns
    /total[:\s]*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /amount[:\s]*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /grand\s*total[:\s]*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /total\s*paid[:\s]*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /amount\s*paid[:\s]*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /bill[:\s]*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /order\s*total[:\s]*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    
    // Only currency symbols with meaningful amounts (>= ₹10)
    /₹\s*([1-9][0-9,]+(?:\.[0-9]{1,2})?)/g,
  ];
  
  let bestAmount = 0;
  let bestAmountStr = '₹0';
  
  // Find meaningful amounts only
  for (const pattern of amountPatterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      const numericMatch = match[0].match(/([0-9,]+(?:\.[0-9]{1,2})?)/);
      if (numericMatch) {
        const amount = numericMatch[1].replace(/,/g, '');
        const numAmount = parseFloat(amount);
        
        // STRICT: Only amounts >= ₹10 and <= ₹50000 (reasonable purchase range)
        if (!isNaN(numAmount) && numAmount >= 10 && numAmount <= 50000 && numAmount > bestAmount) {
          bestAmount = numAmount;
          bestAmountStr = `₹${numAmount}`;
        }
      }
    }
  }
  
  // If no valid amount found, return empty
  if (bestAmount === 0) {
    
    return createEmptyInvoice();
  }
  
  // Extract vendor name from common patterns
  let vendor = 'Unknown Vendor';
  const vendorPatterns = [
    /from\s+([^<\n]+)/i,
    /by\s+([^<\n]+)/i,
    /at\s+([^<\n]+)/i,
  ];
  
  for (const pattern of vendorPatterns) {
    const match = text.match(pattern);
    if (match) {
      vendor = match[1].trim().replace(/[<>]/g, '');
      break;
    }
  }
  
  // Extract date patterns
  let date = new Date().toISOString();
  const datePatterns = [
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/,
    /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/,
    /(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/,
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const parsedDate = new Date(match[1]);
        if (!isNaN(parsedDate.getTime())) {
          date = parsedDate.toISOString();
          break;
        }
      } catch (e) {
        // Continue to next pattern
      }
    }
  }
  
  // Extract invoice number
  let invoiceNumber = '';
  const invoicePatterns = [
    /invoice\s*(?:no\.?|number|#)?\s*:?\s*([A-Z0-9\-]+)/i,
    /order\s*(?:no\.?|number|#)?\s*:?\s*([A-Z0-9\-]+)/i,
    /receipt\s*(?:no\.?|number|#)?\s*:?\s*([A-Z0-9\-]+)/i,
  ];
  
  for (const pattern of invoicePatterns) {
    const match = text.match(pattern);
    if (match) {
      invoiceNumber = match[1];
      break;
    }
  }

  return {
    vendor,
    invoiceNumber,
    date,
    total: bestAmount,
    subtotal: bestAmount * 0.9, // Estimate
    taxes: bestAmount * 0.1, // Estimate  
    shipping: 0,
    discount: 0,
    currency: 'INR',
    items: [{
      name: 'Parsed Item',
      description: 'Extracted from email content',
      quantity: 1,
      unitPrice: bestAmount,
      price: bestAmount,
      category: 'Other'
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
    notes: 'Parsed using fallback method (Gemini disabled)'
  };
}

/**
 * Validate and sanitize parsed invoice data
 */
function validateInvoiceData(data: any): ParsedInvoice {
  // Ensure required fields exist with proper types
  const validated: ParsedInvoice = {
    vendor: String(data.vendor || 'Unknown Vendor'),
    invoiceNumber: String(data.invoiceNumber || 'Unknown'),
    date: String(data.date || ''),
    total: Number(data.total) || 0,
    subtotal: Number(data.subtotal) || 0,
    taxes: Number(data.taxes) || 0,
    shipping: Number(data.shipping) || 0,
    discount: Number(data.discount) || 0,
    currency: String(data.currency || 'USD'),
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
    notes: String(data.notes || '')
  };
  
  // Validate date format
  if (validated.date && !/^\d{4}-\d{2}-\d{2}$/.test(validated.date)) {
    validated.date = '';
  }
  
  // Ensure monetary values are positive
  validated.total = Math.max(0, validated.total);
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
  
  return validated;
}

/**
 * Parse invoice with automatic detection of input type
 */
export async function parseInvoice(input: string | File | Buffer): Promise<ParsedInvoice> {
  try {
    let result: ParsedInvoice;
    
    if (typeof input === 'string') {
      result = await parseInvoiceText(input);
    } else {
      result = await parseInvoiceFile(input);
    }
    
    return result;
  } catch (error) {
    throw error;
  }
}

/**
 * Test the Gemini connection
 */
export async function testGeminiConnection(): Promise<boolean> {
  try {
    const model = getGeminiModel();
    
    const testPrompt = 'Hello, this is a test message. Please respond with "Hello back!"';
    
    const result = await model.generateContent(testPrompt);
    const response = await result.response;
    const textResponse = response.text();
    
    // Log only the AI response for debugging

    return true;
  } catch (error) {
    return false;
  }
}
