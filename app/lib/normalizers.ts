export type Nullable<T> = T | null | undefined;

export function parseAmountToNumber(value: Nullable<string | number>): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return isFinite(value) ? value : 0;
  // Remove INR symbol, commas, spaces, and non-numeric except dot and minus
  const cleaned = value.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isFinite(parsed) ? parsed : 0;
}

export function formatINR(amount: number): string {
  try {
    const formatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
    return `₹${formatter.format(amount)}`;
  } catch {
    return `₹${amount}`;
  }
}

export function normalizeDateISO(date: Nullable<string | Date>): string {
  if (!date) return new Date().toISOString().split('T')[0];
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
  return d.toISOString().split('T')[0];
}

export function pickString(value: Nullable<string>, fallback = ''): string {
  if (!value) return fallback;
  return String(value).trim();
}

export function normalizePurchase(raw: any, index: number) {
  const amountNumber = parseAmountToNumber(raw?.amount);
  return {
    id: raw?.id || `purchase-${index + 1}`,
    vendor: pickString(raw?.vendor || raw?.merchant, 'Unknown Vendor'),
    subject: pickString(raw?.subject || raw?.description, 'Purchase'),
    category: pickString(raw?.category, 'Other'),
    date: normalizeDateISO(raw?.date),
    amountNumber,
    amountFormatted: formatINR(amountNumber),
    isInvoice: Boolean(raw?.isInvoice),
    messageId: raw?.messageId,
    attachmentId: raw?.attachmentId,
  };
}

// Document normalizers for converting Gmail data to proper document format

export interface NormalizedDocument {
  id: string;
  name: string;
  title: string;
  type: 'invoice' | 'receipt' | 'warranty' | 'refund';
  amount: string;
  date: string;
  vendor: string;
  category: string;
  size: string;
  mimeType: string;
  emailSubject: string;
  emailFrom: string;
  emailDate: string;
  messageId?: string;
  attachmentId?: string;
  status?: string;
  daysLeft?: number;
  reason?: string;
}

export function normalizeDocumentFromPurchase(purchase: any, index: number): NormalizedDocument {
  // Extract vendor name properly
  const vendor = purchase.vendor || 'Unknown Vendor';
  
  // Clean and format amount
  let formattedAmount = '₹0';
  if (purchase.amount && purchase.amount !== 'N/A' && purchase.amount !== '₹0') {
    const cleanAmount = purchase.amount.toString().replace(/[^\d.-]/g, '');
    const numericAmount = parseFloat(cleanAmount) || 0;
    if (numericAmount > 0) {
      formattedAmount = `₹${numericAmount.toLocaleString('en-IN')}`;
    }
  }
  
  // Determine document type based on vendor and subject
  const subject = purchase.subject || '';
  const vendorLower = vendor.toLowerCase();
  let documentType: 'invoice' | 'receipt' | 'warranty' | 'refund' = 'invoice';
  
  if (vendorLower.includes('swiggy') || vendorLower.includes('zomato') || vendorLower.includes('food')) {
    documentType = 'receipt';
  } else if (subject.toLowerCase().includes('warranty') || vendorLower.includes('warranty')) {
    documentType = 'warranty';
  } else if (subject.toLowerCase().includes('refund') || vendorLower.includes('refund')) {
    documentType = 'refund';
  } else if (subject.toLowerCase().includes('receipt')) {
    documentType = 'receipt';
  }
  
  // Generate proper document name
  const date = new Date(purchase.date || new Date());
  const dateStr = date.toISOString().split('T')[0];
  const documentName = `${vendor.replace(/\s+/g, '_')}_${documentType}_${index + 1}.pdf`;
  
  // Generate title from subject or vendor
  const title = purchase.description || purchase.subject || `${vendor} ${documentType}`;
  
  // Determine category based on vendor
  let category = 'Other';
  if (vendorLower.includes('amazon') || vendorLower.includes('flipkart') || vendorLower.includes('myntra')) {
    category = 'Electronics';
  } else if (vendorLower.includes('swiggy') || vendorLower.includes('zomato')) {
    category = 'Food';
  } else if (vendorLower.includes('uber') || vendorLower.includes('ola')) {
    category = 'Transport';
  } else if (vendorLower.includes('hotel') || vendorLower.includes('booking')) {
    category = 'Travel';
  }
  
  return {
    id: purchase.id || `doc-${index + 1}`,
    name: documentName,
    title: title,
    type: documentType,
    amount: formattedAmount,
    date: dateStr,
    vendor: vendor,
    category: category,
    size: '2.3 MB',
    mimeType: 'application/pdf',
    emailSubject: purchase.subject || '',
    emailFrom: vendor,
    emailDate: dateStr,
    messageId: purchase.messageId,
    status: 'active',
    daysLeft: 30
  };
}

export function createSampleDocuments(): NormalizedDocument[] {
  return [
    {
      id: "1",
      name: "Amazon_Invoice_1.pdf",
      title: "iPhone 15 Pro Invoice",
      type: "invoice",
      vendor: "Amazon",
      amount: "₹89,999",
      date: "2024-01-15",
      category: "Electronics",
      size: "2.3 MB",
      mimeType: "application/pdf",
      emailSubject: "Your Amazon order #12345",
      emailFrom: "Amazon",
      emailDate: "2024-01-15",
      status: "active",
      daysLeft: 30
    },
    {
      id: "2",
      name: "Swiggy_Receipt_1.pdf",
      title: "Swiggy Food Order Receipt",
      type: "receipt",
      vendor: "Swiggy",
      amount: "₹450",
      date: "2024-01-14",
      category: "Food",
      size: "1.8 MB",
      mimeType: "application/pdf",
      emailSubject: "Your Swiggy order #67890",
      emailFrom: "Swiggy",
      emailDate: "2024-01-14",
      status: "active",
      daysLeft: 30
    },
    {
      id: "3",
      name: "Zomato_Receipt_1.pdf",
      title: "Zomato Delivery Receipt",
      type: "receipt",
      vendor: "Zomato",
      amount: "₹650",
      date: "2024-01-13",
      category: "Food",
      size: "0.5 MB",
      mimeType: "application/pdf",
      emailSubject: "Your Zomato order #11111",
      emailFrom: "Zomato",
      emailDate: "2024-01-13",
      status: "active",
      daysLeft: 30
    },
    {
      id: "4",
      name: "Flipkart_Invoice_1.pdf",
      title: "Samsung Galaxy S24 Invoice",
      type: "invoice",
      vendor: "Flipkart",
      amount: "₹79,999",
      date: "2024-01-12",
      category: "Electronics",
      size: "2.1 MB",
      mimeType: "application/pdf",
      emailSubject: "Your Flipkart order #22222",
      emailFrom: "Flipkart",
      emailDate: "2024-01-12",
      status: "active",
      daysLeft: 30
    },
    {
      id: "5",
      name: "Myntra_Invoice_1.pdf",
      title: "Myntra Fashion Order Invoice",
      type: "invoice",
      vendor: "Myntra",
      amount: "₹2,500",
      date: "2024-01-11",
      category: "Fashion",
      size: "1.5 MB",
      mimeType: "application/pdf",
      emailSubject: "Your Myntra order #33333",
      emailFrom: "Myntra",
      emailDate: "2024-01-11",
      status: "active",
      daysLeft: 30
    }
  ];
}

export function enhanceAmountExtraction(text: string): string {
  // Enhanced amount extraction patterns
  const patterns = [
    // Indian Rupee patterns
    /₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /Rs\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /INR\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*\/-/gi,
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*only/gi,
    /worth\s*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /for\s*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /₹\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*worth/gi,
    
    // Total amount patterns
    /total\s*:?\s*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /amount\s*:?\s*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /grand\s*total\s*:?\s*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /subtotal\s*:?\s*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    
    // Order value patterns
    /order\s*value\s*:?\s*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /order\s*amount\s*:?\s*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    
    // Payment patterns
    /payment\s*:?\s*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /paid\s*:?\s*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    
    // Just numbers (fallback)
    /([0-9]{3,}(?:[,\s][0-9]{3})*(?:\.[0-9]{1,2})?)/g
  ];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      // Get the first match and clean it
      let amount = matches[1] || matches[0];
      amount = amount.replace(/[^\d.-]/g, '');
      const numericAmount = parseFloat(amount);
      
      if (numericAmount > 0 && numericAmount < 1000000) { // Reasonable range
        return `₹${numericAmount.toLocaleString('en-IN')}`;
      }
    }
  }
  
  return '₹0';
} 