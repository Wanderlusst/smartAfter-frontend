import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { createServerClient } from '@/app/lib/supabaseClient';

// Ensure we're in a server environment
if (typeof window !== 'undefined') {
  throw new Error('Gmail functions can only be called on the server side');
}

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// Helper function to create proper Gmail date filter - FIXED TO USE CURRENT DATE
function createDateFilter(days: number): string {
  // Use current date instead of hardcoded future date
  const today = new Date();
  const pastDate = new Date();
  pastDate.setDate(today.getDate() - days);
  
  const year = pastDate.getFullYear();
  const month = String(pastDate.getMonth() + 1).padStart(2, '0');
  const day = String(pastDate.getDate()).padStart(2, '0');
  
  // Gmail date format: YYYY/MM/DD
  const dateFilter = `after:${year}/${month}/${day}`;

  return dateFilter;
}

interface ExtendedSession {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

// Removed rate limiting - direct API calls

export async function getGmailClient() {
  const session = await getServerSession(authOptions) as ExtendedSession | null;
  
  if (!session?.accessToken) {
    throw new Error('Not authenticated - Please log in with your Google account');
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth credentials not configured - Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
    expiry_date: (session.expiresAt || 0) * 1000,
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

// Add scope validation function
export function validateGmailScope(session: any): boolean {
  if (!session?.scope) {
    
    return false;
  }
  
  if (!session.scope.includes('gmail.readonly')) {
    
    return false;
  }

  return true;
}

// Enhanced search function
export async function searchEmails(query: string, maxResults: number = 50): Promise<any[]> {

  try {
    const gmail = await getGmailClient();
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    });

    const messages = res.data.messages || [];
    
    // ENHANCED LOGGING: Show detailed results

    // If we found messages, log the first few email subjects/senders for debugging
    if (messages.length > 0) {
      try {
        
        for (let i = 0; i < Math.min(5, messages.length); i++) {
          try {
            const emailDetails = await gmail.users.messages.get({
              userId: 'me',
              id: messages[i].id!,
              format: 'metadata',
              metadataHeaders: ['Subject', 'From', 'Date'],
            });
            const headers = emailDetails.data.payload?.headers || [];
            const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
            const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
            const date = headers.find(h => h.name === 'Date')?.value || 'No Date';
            
          } catch (detailError) {
            
          }
        }
      } catch (sampleError) {
        
      }
    }

    return messages;
  } catch (error: any) {
    
    return []; // Return empty array on any error
  }
}

// Improved batch email fetching
export async function getEmailDetailsBatch(messageIds: string[]) {
  try {
    const gmail = await getGmailClient();
    
    // Process in batches for better performance
    const batchSize = 5; // Reasonable batch size
    const results = [];
    
    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (id) => {
        try {
          const res = await gmail.users.messages.get({
            userId: 'me',
            id: id,
            format: 'full',
          });
          return res.data;
        } catch (err: any) {
          
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(Boolean));
    }
    
    return results;
  } catch (error) {
    
    return [];
  }
}

export async function getEmailDetails(messageId: string) {
  try {
    const gmail = await getGmailClient();
    const res = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    return res.data;
  } catch (error) {
    
    throw error;
  }
}

// Enhanced email content parsing
function parseEmailContent(email: any) {
  const headers = email.payload?.headers || [];
  const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
  const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown Sender';
  const date = headers.find((h: any) => h.name === 'Date')?.value || '';
  const messageId = email.id || '';
  
  // Extract body with better handling for HTML and text parts
  let body = '';
  let htmlBody = '';
  
  if (email.payload?.body?.data) {
    body = Buffer.from(email.payload.body.data, 'base64').toString('utf-8');
  } else if (email.payload?.parts) {
    // Handle multipart messages
    const textPart = email.payload.parts.find((part: any) => part.mimeType === 'text/plain');
    const htmlPart = email.payload.parts.find((part: any) => part.mimeType === 'text/html');
    
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
    }
    
    if (htmlPart?.body?.data) {
      htmlBody = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
      // Strip HTML tags for text analysis
      body = body || htmlBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    }
  }

  return {
    subject,
    from,
    date,
    body,
    htmlBody,
    messageId,
  };
}

// Enhanced amount extraction with more patterns
function extractAmount(text: string): string {
  // Multiple regex patterns for different currency formats
  const patterns = [
    // Direct currency symbols
    /₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/g,           // ₹70.8, ₹1,234.56
    /INR\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,       // INR 70.8
    /Rs\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,     // Rs. 70.8, Rs 70.8
    /\$\s*([0-9,]+(?:\.[0-9]{1,2})?)/g,         // $70.8, $1,234.56
    /USD\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,       // USD 70.8
    /€\s*([0-9,]+(?:\.[0-9]{1,2})?)/g,          // €70.8
    
    // Contextual patterns
    /total[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Total: ₹70.8
    /amount[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Amount: ₹70.8
    /grand\s*total[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Grand Total: ₹70.8
    /paid[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Paid: ₹70.8
    /subtotal[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Subtotal: ₹70.8
    /bill[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Bill: ₹70.8
    /price[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Price: ₹70.8
    /cost[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Cost: ₹70.8
    /worth[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Worth: ₹70.8
    /for[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // For: ₹70.8
    
    // Order specific patterns
    /order\s*total[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Order Total: ₹70.8
    /order\s*amount[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Order Amount: ₹70.8
    /order\s*value[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Order Value: ₹70.8
    
    // Receipt/Invoice patterns
    /receipt[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Receipt: ₹70.8
    /invoice[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Invoice: ₹70.8
    
    // Movie ticket specific patterns
    /total\s*amount[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Total Amount: ₹70.8
    /booking\s*charge[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Booking Charge: ₹70.8
    /cinema[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Cinema: ₹70.8
    /movie[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Movie: ₹70.8
    /ticket[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Ticket: ₹70.8
    
    // Loose number patterns with currency context
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*rupees?/gi,     // 70.8 rupees
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*inr/gi,         // 70.8 INR
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*rs\.?/gi,       // 70.8 Rs
    
    // Additional patterns for various formats
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*\/-/gi,          // 70.8/-
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*only/gi,        // 70.8 only
    
    // More aggressive patterns for any number that might be an amount
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*₹/g,            // 70.8 ₹
    /₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/g,            // ₹ 70.8
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*\/-/gi,          // 70.8/-
    
    // New aggressive patterns for common email formats
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*rs/gi,          // 70.8 rs
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*rupee/gi,       // 70.8 rupee
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*\/-/gi,          // 70.8 /-
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*only/gi,        // 70.8 only
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*\/-/gi,          // 70.8 /-
    
    // Patterns for common payment amounts
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*paid/gi,        // 70.8 paid
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*charged/gi,     // 70.8 charged
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*debited/gi,     // 70.8 debited
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*credited/gi,    // 70.8 credited
  ];
  
  let bestMatch = null;
  let highestAmount = 0;
  
  for (const pattern of patterns) {
    if (typeof pattern === 'string') continue; // Skip string patterns
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      // Extract the numeric part and clean it
      const numericMatch = match[0].match(/([0-9,]+(?:\.[0-9]{1,2})?)/);
      if (numericMatch) {
        const amount = numericMatch[1].replace(/,/g, '');
        const numAmount = parseFloat(amount);
        if (!isNaN(numAmount) && numAmount > 0) {
          // Keep the highest amount found (likely the total)
          if (numAmount > highestAmount) {
            highestAmount = numAmount;
            bestMatch = `₹${numAmount}`;
          }
        }
      }
    }
  }
  
  // If no amount found with patterns, try to find any number that might be an amount
  if (!bestMatch) {
    const numberMatches = text.match(/([0-9,]+(?:\.[0-9]{1,2})?)/g);
    if (numberMatches) {
      let maxAmount = 0;
      for (const match of numberMatches) {
        const amount = match.replace(/,/g, '');
        const numAmount = parseFloat(amount);
        if (!isNaN(numAmount) && numAmount > 0 && numAmount < 1000000) { // Reasonable amount range
          if (numAmount > maxAmount) {
            maxAmount = numAmount;
            bestMatch = `₹${numAmount}`;
          }
        }
      }
    }
  }
  
  return bestMatch || 'N/A';
}

// Function to get PDF attachments from email
function getPdfAttachments(email: any): Array<{id: string, filename: string}> {
  const attachments: Array<{id: string, filename: string}> = [];
  
  function extractAttachments(parts: any[]) {
    for (const part of parts) {
      if (part.filename && part.filename.toLowerCase().endsWith('.pdf') && part.body?.attachmentId) {
        attachments.push({
          id: part.body.attachmentId,
          filename: part.filename
        });
      }
      
      if (part.parts) {
        extractAttachments(part.parts);
      }
    }
  }
  
  if (email.payload?.parts) {
    extractAttachments(email.payload.parts);
  }
  
  return attachments;
}

// Enhanced extractPurchases function with broader search and database integration
export async function extractPurchases(days: number = 90) {
  try {
    // ENABLED: Real Gmail API calls for production data

    const startTime = Date.now();
    
    // Determine if running on server side (SSR)
    const isSSR = typeof window === 'undefined';
    
    // Log SSR status for debugging
    if (isSSR) {
      
    }
    
    // Check authentication first - SINGLE authentication call
    let gmail;
    try {
      gmail = await getGmailClient();
      
    } catch (authError) {
      
      throw new Error(`Gmail authentication failed: ${authError}`);
    }
    
    // Get user session for database operations
    const session = await getServerSession(authOptions) as ExtendedSession | null;
    const userId = session?.user?.email;
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    // Skip Supabase initialization to prevent connection errors
    // const supabase = createServerClient();
    
    // Search for ALL invoice and purchase-related emails with comprehensive queries
    let messages;
    try {
      // FOCUSED search queries for PRIMARY inbox only - REAL purchase transactions
      const searchQueries = [
        // REAL order confirmations and receipts
        'subject:(invoice OR receipt OR "order confirmed" OR "order placed" OR "payment received" OR "transaction successful")',
        
        // REAL purchases from major platforms (PRIMARY inbox only)
        'from:(amazon.in OR flipkart.com OR swiggy.com OR zomato.com OR paytm.com OR myntra.com OR bigbasket.com)',
        
        // REAL payment confirmations
        'subject:("payment of" OR "amount paid" OR "total paid" OR "bill amount")',
      ];
      
      // For faster SSR, limit to fewer results based on days
      const maxResults = isSSR ? Math.min(5, days) : Math.min(20, days * 2); // SUPER FAST for 7 days
      
      const allMessages = [];
      
      // Add PROPER date filter for Gmail API
      const dateFilter = createDateFilter(days);
      
      for (const query of searchQueries) {
        try {
          // CRITICAL: Search only PRIMARY inbox (not promotions/spam/social)
          const fullQuery = `in:primary ${query} ${dateFilter}`.trim();
          
          const results = await searchEmails(fullQuery, 50);
          allMessages.push(...results);
          
        } catch (err) {
          
        }
      }
      
      // Remove duplicates based on message ID
      const uniqueMessages = allMessages.filter((msg, index, self) => 
        index === self.findIndex(m => m.id === msg.id)
      );
      
      messages = uniqueMessages;
      
    } catch (searchError) {
      
      throw new Error(`Email search failed: ${searchError}`);
    }
    
    if (messages.length === 0) {
      
      return [];
    }
    
    // Extract message IDs for batch processing
    const messageIds = messages.map(msg => msg.id!).filter(Boolean);

    // Process emails in batches to reduce API calls - OPTIMIZED for 7 days
    const batchSize = isSSR ? 1 : 3; // SUPER FAST: 1 email at a time for SSR, 3 for client
    const purchases = [];
    
    // OPTIMIZATION: Use the existing Gmail client instead of calling getEmailDetailsBatch
    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);
      
      try {

        // Direct batch processing
        const batchPromises = batch.map(async (id) => {
          try {
            const res = await gmail.users.messages.get({
              userId: 'me',
              id: id,
              format: 'full',
            });
            return res.data;
          } catch (err: any) {
            
            return null;
          }
        });
        
        const emailDetails = await Promise.all(batchPromises);
        const validEmails = emailDetails.filter(Boolean);

        for (const email of validEmails) {
          if (!email) {
            
            continue;
          }
          
          try {
            const parsed = parseEmailContent(email!);
            const vendor = parsed.from || 'Unknown Vendor';
            const { enhanceAmountExtraction } = await import('@/app/lib/normalizers');
            const amount = enhanceAmountExtraction(parsed.subject + ' ' + parsed.body);
            const isInvoiceEmail = isInvoiceRelated(parsed.subject, parsed.body);
            
            if (isInvoiceEmail || amount !== 'N/A') {
              // Determine category from vendor and subject
              const category = determineCategory(vendor, parsed.subject);
              
              const purchase = {
                id: email.id || `email-${Date.now()}-${Math.random()}`,
                vendor,
                amount: amount !== 'N/A' ? amount : '₹0',
                date: parsed.date,
                subject: parsed.subject,
                messageId: parsed.messageId,
                isInvoice: isInvoiceEmail,
                description: parsed.subject, // Add description for document title
                body: parsed.body.substring(0, 200), // Add body preview
                category, // Add category for proper chart display
              };

              purchases.push(purchase);
              
              // Database storage disabled to prevent connection errors
              // await storePurchaseInDatabase(null, userId, purchase);
            } else if (amount !== 'N/A') {
              // Add non-invoice emails that have amounts
              const category = determineCategory(vendor, parsed.subject);
              
              const purchase = {
                id: email.id || `email-${Date.now()}-${Math.random()}`,
                vendor,
                amount: amount,
                date: parsed.date,
                subject: parsed.subject,
                messageId: parsed.messageId,
                isInvoice: false,
                description: parsed.subject,
                body: parsed.body.substring(0, 200),
                category, // Add category for proper chart display
              };

              purchases.push(purchase);
              
              // Database storage disabled to prevent connection errors
              // await storePurchaseInDatabase(null, userId, purchase);
            } else {
              
            }
          } catch (parseError) {
            
            // Continue with next email
          }
        }
        
        // Add delay between batches to avoid rate limiting
        if (i + batchSize < messageIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced delay to 1 second
        }
      } catch (batchError) {
        
        // Continue with next batch
      }
    }
    
    const endTime = Date.now();

    if (purchases.length === 0) {

    }
    
    return purchases;
  } catch (error) {
    
    throw error;
  }
}

// Helper function to determine if email is invoice-related
function isInvoiceRelated(subject: string, body: string): boolean {
  const invoiceKeywords = [
    'invoice', 'receipt', 'bill', 'payment', 'transaction', 'order', 'purchase',
    'confirmation', 'thank you for your order', 'order placed', 'payment successful',
    'delivery', 'shipped', 'out for delivery', 'order confirmed', 'payment received',
    'total', 'amount', 'price', 'cost', 'worth', 'grand total', 'subtotal',
    'paid', 'due', 'balance', 'statement', 'summary'
  ];
  
  const searchText = `${subject} ${body}`.toLowerCase();
  
  return invoiceKeywords.some(keyword => searchText.includes(keyword));
}

// Helper function to extract amount from subject line patterns
function extractAmountFromSubject(subject: string): string {
  // Additional patterns for subject lines
  const subjectPatterns = [
    /worth\s*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /for\s*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /₹\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*worth/gi,
    /₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /Rs\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /INR\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*\/-/gi,
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*only/gi,
  ];

  for (const pattern of subjectPatterns) {
    const match = subject.match(pattern);
    if (match) {
      const numericMatch = match[0].match(/([0-9,]+(?:\.[0-9]{1,2})?)/);
      if (numericMatch) {
        const amount = numericMatch[1].replace(/,/g, '');
        const numAmount = parseFloat(amount);
        if (!isNaN(numAmount) && numAmount > 0) {
          return `₹${numAmount}`;
        }
      }
    }
  }
  
  return 'N/A';
}

// Enhanced extractRefunds function with broader search
export async function extractRefunds(days: number = 90) {
  try {
    
    const startTime = Date.now();
    
    // Determine if running on server side (SSR)
    const isSSR = typeof window === 'undefined';
    
    // Check authentication first - SINGLE authentication call
    let gmail;
    try {
      gmail = await getGmailClient();
      
    } catch (authError) {
      
      throw new Error(`Gmail authentication failed: ${authError}`);
    }
    
    // Get user session for database operations
    const session = await getServerSession(authOptions) as ExtendedSession | null;
    const userId = session?.user?.email;
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    // Search for refund-related emails
    let messages;
    try {
      const searchQueries = [
        'subject:(refund OR "refund processed" OR "refund issued" OR "refund confirmation" OR "money back" OR "return processed")',
        'from:(amazon.in OR flipkart.com OR paytm.com OR myntra.com) subject:(refund OR return)',
      ];
      
      const maxResults = isSSR ? Math.min(5, days) : Math.min(25, days);
      const allMessages = [];
      const dateFilter = createDateFilter(days);
      
      for (const query of searchQueries) {
        try {
          const fullQuery = `in:primary ${query} ${dateFilter}`.trim();
          
          const results = await searchEmails(fullQuery, maxResults);
          allMessages.push(...results);
        } catch (err) {
          
        }
      }
      
      // Remove duplicates
      const uniqueMessages = allMessages.filter((msg, index, self) => 
        index === self.findIndex(m => m.id === msg.id)
      );
      
      messages = uniqueMessages;
      
    } catch (searchError) {
      
      throw new Error(`Refund email search failed: ${searchError}`);
    }
    
    if (messages.length === 0) {
      
      return [];
    }
    
    // Extract message IDs for batch processing
    const messageIds = messages.map(msg => msg.id!).filter(Boolean);

    // Process emails in batches
    const batchSize = isSSR ? Math.min(2, Math.ceil(days / 7)) : Math.min(5, Math.ceil(days / 7));
    const refunds = [];
    
    // OPTIMIZATION: Use the existing Gmail client instead of calling getEmailDetailsBatch
    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);
      
      try {

        // OPTIMIZATION: Direct batch processing without additional authentication
        const batchPromises = batch.map(async (id) => {
          try {
            const res = await gmail.users.messages.get({
              userId: 'me',
              id: id,
              format: 'full',
            });
            return res.data;
          } catch (err: any) {
            
            return null;
          }
        });
        
        const emailDetails = await Promise.all(batchPromises);
        const validEmails = emailDetails.filter(Boolean);

        for (const email of validEmails) {
          if (!email) continue;
          
          try {
            const parsed = parseEmailContent(email);
            const vendor = parsed.from || 'Unknown Vendor';
            const { enhanceAmountExtraction } = await import('@/app/lib/normalizers');
            const amount = enhanceAmountExtraction(parsed.subject + ' ' + parsed.body);
            
            if (amount !== 'N/A') {
              const refund = {
                id: email.id || `refund-${Date.now()}-${Math.random()}`,
                vendor,
                amount: amount,
                date: parsed.date,
                subject: parsed.subject,
                messageId: parsed.messageId,
                description: parsed.subject,
                body: parsed.body.substring(0, 200),
              };

              refunds.push(refund);
            }
          } catch (parseError) {
            
          }
        }
        
        // Add delay between batches to avoid rate limiting
        if (i + batchSize < messageIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced delay to 1 second
        }
      } catch (batchError) {
        
      }
    }
    
    const endTime = Date.now();

    return refunds;
  } catch (error) {
    
    throw error;
  }
}

// Enhanced extractWarranties function with broader search
export async function extractWarranties(days: number = 90) {
  try {
    
    const startTime = Date.now();
    
    // Determine if running on server side (SSR)
    const isSSR = typeof window === 'undefined';
    
    // Check authentication first - SINGLE authentication call
    let gmail;
    try {
      gmail = await getGmailClient();
      
    } catch (authError) {
      
      throw new Error(`Gmail authentication failed: ${authError}`);
    }
    
    // Get user session for database operations
    const session = await getServerSession(authOptions) as ExtendedSession | null;
    const userId = session?.user?.email;
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    // Search for warranty-related emails
    let messages;
    try {
      const searchQueries = [
        'subject:(warranty OR "extended warranty" OR "protection plan" OR "care plan" OR "insurance")',
        'from:(amazon.in OR flipkart.com OR paytm.com OR myntra.com) subject:(warranty OR protection)',
      ];
      
      const maxResults = isSSR ? Math.min(5, days) : Math.min(25, days);
      const allMessages = [];
      const dateFilter = createDateFilter(days);
      
      for (const query of searchQueries) {
        try {
          const fullQuery = `in:primary ${query} ${dateFilter}`.trim();
          
          const results = await searchEmails(fullQuery, maxResults);
          allMessages.push(...results);
        } catch (err) {
          
        }
      }
      
      // Remove duplicates
      const uniqueMessages = allMessages.filter((msg, index, self) => 
        index === self.findIndex(m => m.id === msg.id)
      );
      
      messages = uniqueMessages;
      
    } catch (searchError) {
      
      throw new Error(`Warranty email search failed: ${searchError}`);
    }
    
    if (messages.length === 0) {
      
      return [];
    }
    
    // Extract message IDs for batch processing
    const messageIds = messages.map(msg => msg.id!).filter(Boolean);

    // Process emails in batches
    const batchSize = isSSR ? Math.min(2, Math.ceil(days / 7)) : Math.min(5, Math.ceil(days / 7));
    const warranties = [];
    
    // OPTIMIZATION: Use the existing Gmail client instead of calling getEmailDetailsBatch
    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);
      
      try {

        // Direct batch processing
        const batchPromises = batch.map(async (id) => {
          try {
            const res = await gmail.users.messages.get({
              userId: 'me',
              id: id,
              format: 'full',
            });
            return res.data;
          } catch (err: any) {
            
            return null;
          }
        });
        
        const emailDetails = await Promise.all(batchPromises);
        const validEmails = emailDetails.filter(Boolean);

        for (const email of validEmails) {
          if (!email) continue;
          
          try {
            const parsed = parseEmailContent(email);
            const vendor = parsed.from || 'Unknown Vendor';
            const { enhanceAmountExtraction } = await import('@/app/lib/normalizers');
            const amount = enhanceAmountExtraction(parsed.subject + ' ' + parsed.body);
            
            // Check if email contains warranty-related content
            const isWarrantyEmail = parsed.subject.toLowerCase().includes('warranty') || 
                                   parsed.subject.toLowerCase().includes('protection') ||
                                   parsed.subject.toLowerCase().includes('care plan') ||
                                   parsed.body.toLowerCase().includes('warranty') ||
                                   parsed.body.toLowerCase().includes('protection');
            
            if (isWarrantyEmail) {
              const warranty = {
                id: email.id || `warranty-${Date.now()}-${Math.random()}`,
                vendor,
                amount: amount !== 'N/A' ? amount : '₹0',
                date: parsed.date,
                subject: parsed.subject,
                messageId: parsed.messageId,
                description: parsed.subject,
                body: parsed.body.substring(0, 200),
                status: 'active', // Default status
                expiryDate: null, // Will be extracted if available
              };

              warranties.push(warranty);
            }
          } catch (parseError) {
            
          }
        }
        
        // Add delay between batches to avoid rate limiting
        if (i + batchSize < messageIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced delay to 1 second
        }
      } catch (batchError) {
        
      }
    }
    
    const endTime = Date.now();

    return warranties;
  } catch (error) {
    
    throw error;
  }
} 

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// NEW: Download Gmail attachment
export async function downloadAttachment(messageId: string, attachmentId: string): Promise<{ data: Buffer; mimeType: string; filename: string }> {
  const gmail = await getGmailClient();
  
  try {

    const response = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: messageId,
      id: attachmentId,
    });
    
    if (!response.data.data) {
      throw new Error('No attachment data received');
    }
    
    // Decode base64 data
    const data = Buffer.from(response.data.data, 'base64');
    
    // Get metadata from the message to find mimeType and filename
    const messageResponse = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'metadata',
      metadataHeaders: ['Subject', 'From', 'Date']
    });
    
    // Find the attachment part to get mimeType and filename
    let mimeType = 'application/octet-stream';
    let filename = 'attachment';
    
    if (messageResponse.data.payload?.parts) {
      for (const part of messageResponse.data.payload.parts) {
        if (part.body?.attachmentId === attachmentId) {
          mimeType = part.mimeType || 'application/octet-stream';
          filename = part.filename || 'attachment';
          break;
        }
      }
    }

    return { data, mimeType, filename };
    
  } catch (error) {
    
    throw error;
  }
} 

// NEW: Extract real documents with attachments from Gmail
export async function extractDocumentsWithAttachments(days: number = 30): Promise<any[]> {
  const gmail = await getGmailClient();

  // Search for emails with attachments (has:attachment) and relevant content
  const afterDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const yyyy = afterDate.getFullYear();
  const mm = String(afterDate.getMonth() + 1).padStart(2, '0');
  const dd = String(afterDate.getDate()).padStart(2, '0');
  const afterQuery = `${yyyy}/${mm}/${dd}`;
  
  // FOCUSED SEARCH: Look for PRIMARY emails with attachments, no date restriction
  const query = `in:primary has:attachment`;

  try {
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 100, // Increased to find more emails
    });

    const messages = listRes.data.messages || [];

    if (messages.length === 0) {
      
      return [];
    }

    const documents: any[] = [];
    let processed = 0;
    const batchSize = 10;
    const concurrency = 3;

    // Process emails in batches
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);

      try {
        // Get full email details for this batch
        const emailPromises = batch.map(async (msg) => {
          try {
            const res = await gmail.users.messages.get({
              userId: 'me',
              id: msg.id!,
              format: 'full',
            });
            return res.data;
          } catch (error) {
            
            return null;
          }
        });

        const emails = await Promise.all(emailPromises);
        const validEmails = emails.filter(email => email !== null);

        for (const email of validEmails) {
          if (!email) continue;

          try {
            const subject = email.payload?.headers?.find(h => h.name === 'Subject')?.value || '';
            const from = email.payload?.headers?.find(h => h.name === 'From')?.value || '';
            const date = email.payload?.headers?.find(h => h.name === 'Date')?.value || '';
            const id = email.id || '';

            // Extract vendor name
            let vendor = from.split('<')[0].trim();
            if (vendor.includes('"')) {
              vendor = vendor.replace(/"/g, '').trim();
            }

            // Extract attachments
            const attachments = extractAttachments(email);
            
            if (attachments.length > 0) {
              // Extract amount from subject or body
              const subjectAmount = basicAmountExtract(subject);
              const bodyAmount = extractAmountFromBody(email);
              const amount = bodyAmount !== '₹0' ? bodyAmount : subjectAmount;
              
              // Create document entries for each attachment
              attachments.forEach((attachment, attIndex) => {
                const document = {
                  id: `${id}-${attIndex}`,
                  messageId: id,
                  name: attachment.filename || `${vendor}_${attachment.mimeType?.split('/')[1] || 'attachment'}_${attIndex + 1}`,
                  title: subject || 'Document',
                  type: determineDocumentType(subject, attachment.mimeType),
                  amount: amount,
                  date: date || new Date().toISOString(),
                  vendor: vendor,
                  category: determineCategory(vendor, subject),
                  size: formatFileSize(attachment.size || 0),
                  mimeType: attachment.mimeType || 'application/octet-stream',
                  emailSubject: subject,
                  emailFrom: from,
                  emailDate: date,
                  attachmentId: attachment.attachmentId,
                  isPdf: attachment.mimeType === 'application/pdf',
                  isInvoice: isLikelyInvoice(subject),
                };
                
                documents.push(document);
              });
            }
            
            processed++;
            if (processed % 10 === 0) {
              
            }
            
          } catch (error) {
            
          }
        }

        // Add delay between batches to avoid rate limiting
        if (i + batchSize < messages.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (batchError) {
        
      }
    }

    return documents;
    
  } catch (error) {
    
    return [];
  }
} 

// Helper function to extract attachments from Gmail message
function extractAttachments(message: any): any[] {
  const attachments: any[] = [];
  
  function processPart(part: any) {
    if (part.body?.attachmentId) {
      // This is an attachment
      attachments.push({
        attachmentId: part.body.attachmentId,
        filename: part.filename || 'attachment',
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body.size || 0,
      });
    }
    
    // Recursively process nested parts
    if (part.parts) {
      part.parts.forEach(processPart);
    }
  }
  
  if (message.payload) {
    processPart(message.payload);
  }
  
  return attachments;
}

// Enhanced function to determine document type
function determineDocumentType(subject: string, mimeType?: string): string {
  const subjectLower = subject.toLowerCase();
  
  // Check for invoice-related keywords
  if (subjectLower.includes('invoice') || subjectLower.includes('bill') || 
      subjectLower.includes('billing') || subjectLower.includes('payment')) {
    return 'invoice';
  }
  
  // Check for receipt-related keywords
  if (subjectLower.includes('receipt') || subjectLower.includes('confirmation') || 
      subjectLower.includes('order confirmation') || subjectLower.includes('purchase confirmation')) {
    return 'receipt';
  }
  
  // Check for order-related keywords
  if (subjectLower.includes('order') || subjectLower.includes('purchase') || 
      subjectLower.includes('booking') || subjectLower.includes('reservation')) {
    return 'order';
  }
  
  // Check for PDF mime type
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }
  
  // Check for image attachments that might be receipts
  if (mimeType && mimeType.startsWith('image/')) {
    return 'receipt';
  }
  
  return 'document';
}

// Helper function to determine category
function determineCategory(vendor: string, subject: string): string {
  const vendorLower = vendor.toLowerCase();
  const subjectLower = subject.toLowerCase();
  
  if (vendorLower.includes('amazon') || vendorLower.includes('flipkart') || subjectLower.includes('shopping')) {
    return 'Shopping';
  }
  
  if (vendorLower.includes('swiggy') || vendorLower.includes('zomato') || subjectLower.includes('food')) {
    return 'Food & Dining';
  }
  
  if (vendorLower.includes('myntra') || subjectLower.includes('fashion')) {
    return 'Fashion';
  }
  
  if (vendorLower.includes('paytm') || subjectLower.includes('payment')) {
    return 'Payment';
  }
  
  return 'Other';
}

// Enhanced function to check if email is likely an invoice
function isLikelyInvoice(subject: string): boolean {
  const subjectLower = subject.toLowerCase();
  
  // Check for invoice-related keywords
  const invoiceKeywords = [
    'invoice', 'receipt', 'bill', 'billing', 'payment', 'statement',
    'order confirmation', 'purchase confirmation', 'booking confirmation',
    'reservation confirmation', 'payment confirmation'
  ];
  
  return invoiceKeywords.some(keyword => subjectLower.includes(keyword));
}

// Enhanced function to extract amount from body
function extractAmountFromBody(email: any): string {
  try {
    // Try to get body from different parts
    let bodyText = '';
    
    // Check main body
    if (email.payload?.body?.data) {
      bodyText += Buffer.from(email.payload.body.data, 'base64').toString('utf-8') + ' ';
    }
    
    // Check parts for body content (text/plain and text/html)
    if (email.payload?.parts) {
      for (const part of email.payload.parts) {
        if (part.body?.data && (part.mimeType === 'text/plain' || part.mimeType === 'text/html')) {
          try {
            const decodedBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
            bodyText += decodedBody + ' ';
          } catch (decodeError) {
            
          }
        }
        
        // Check nested parts
        if (part.parts) {
          for (const nestedPart of part.parts) {
            if (nestedPart.body?.data && (nestedPart.mimeType === 'text/plain' || nestedPart.mimeType === 'text/html')) {
              try {
                const decodedBody = Buffer.from(nestedPart.body.data, 'base64').toString('utf-8');
                bodyText += decodedBody + ' ';
              } catch (decodeError) {
                
              }
            }
          }
        }
      }
    }
    
    if (bodyText.trim()) {
      const amount = basicAmountExtract(bodyText);
      
      return amount;
    }
    
    return '₹0';
  } catch (error) {
    
    return '₹0';
  }
}

// Enhanced amount extraction function
function basicAmountExtract(text: string): string {
  if (!text) return '₹0';
  
  // Look for currency patterns like ₹100, $50, etc.
  const currencyPatterns = [
    /₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
    /\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
    /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*₹/g,
    /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*\$/g,
    // Also look for "Total: ₹100" or "Amount: ₹100" patterns
    /(?:total|amount|price|cost|sum|bill|invoice|receipt)[\s:]*₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
    /(?:total|amount|price|cost|sum|bill|invoice|receipt)[\s:]*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
  ];
  
  for (const pattern of currencyPatterns) {
    const match = pattern.exec(text);
    if (match) {
      const amount = match[1] || match[0];
      if (amount && amount !== '0' && amount !== '0.00') {
        return `₹${amount.replace(/,/g, '')}`;
      }
    }
  }
  
  // Look for numbers that might be amounts (3+ digits)
  const numberPattern = /(\d{3,}(?:,\d{3})*(?:\.\d{2})?)/g;
  const numberMatch = numberPattern.exec(text);
  if (numberMatch) {
    const number = numberMatch[1];
    if (number && number !== '000' && number !== '000.00') {
      return `₹${number.replace(/,/g, '')}`;
    }
  }
  
  return '₹0';
} 