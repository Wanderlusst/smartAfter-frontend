import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { google } from 'googleapis';
import { getCachedData, setCachedData } from '@/lib/redis';
// PDF parsing using built-in methods to avoid library issues

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

interface EmailData {
  id: string;
  subject: string;
  date: string;
  vendor: string;
  amount: string;
  isInvoice: boolean;
  snippet: string;
}

interface GmailResponse {
  emails: EmailData[];
  totalCount: number;
  days: number;
  cached: boolean;
  timestamp: string;
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in with your Google account' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Validate days parameter
    if (days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Days parameter must be between 1 and 365' },
        { status: 400 }
      );
    }

    // Generate cache key
    const cacheKey = `gmail_emails:${session.user.email}:${days}`;
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = await getCachedData<GmailResponse>(cacheKey);
      if (cachedData) {
        
        return NextResponse.json(cachedData);
      }
    }

    // Check if we have the required environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Google OAuth credentials not configured' },
        { status: 500 }
      );
    }

    // Get OAuth tokens from session
    const accessToken = (session as any).accessToken;
    const refreshToken = (session as any).refreshToken;
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token available - Please re-authenticate' },
        { status: 401 }
      );
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Create Gmail client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Calculate date range
    const now = new Date();
    const daysAgo = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    const afterDate = daysAgo.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Search for purchase-related emails in the date range
    const searchQuery = `after:${afterDate} (receipt OR invoice OR payment OR order OR purchase OR transaction OR bill OR statement)`;
    const messagesResponse = await gmail.users.messages.list({
      userId: 'me',
      q: searchQuery,
      maxResults: 100,
    });

    const messages = messagesResponse.data.messages || [];

    // Fetch email details in batches
    const emailData: EmailData[] = [];
    const batchSize = 10; // Process in batches for better performance

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (message) => {
        try {
          const emailResponse = await gmail.users.messages.get({
            userId: 'me',
            id: message.id!,
            format: 'full', // Get full email content including body and attachments
            metadataHeaders: ['Subject', 'From', 'Date'],
          });

          const headers = emailResponse.data.payload?.headers || [];
          const subject = headers.find(h => h.name === 'Subject')?.value || '';
          const from = headers.find(h => h.name === 'From')?.value || '';
          const date = headers.find(h => h.name === 'Date')?.value || '';
          
          // Parse vendor from "From" field
          const vendor = extractVendor(from);
          
          // Extract amount from subject (basic parsing)
          let amount = extractAmount(subject);
          
          // Extract amount from email body content
          const emailBody = extractEmailBody(emailResponse.data.payload);
          const bodyAmount = extractAmountFromText(emailBody);
          
          // COMMENTED OUT - PDF attachment processing for credit cards disabled
          // Focus is now on email parsing only
          let pdfAmount = '0';
          // try {
          //   if (emailResponse.data.payload?.parts) {
          //     pdfAmount = await extractAmountFromAttachments(emailResponse.data.payload, gmail, message.id!);
          //     if (pdfAmount !== '0') {
          //       console.log('📄 PDF amount extracted:', pdfAmount);
          //     }
          //   }
          // } catch (pdfError) {
          //   console.log('⚠️ PDF processing failed:', pdfError.message);
          //   // Continue without PDF processing
          // }
          
          // Use the best amount found (PDF > Body > Subject)
          if (pdfAmount !== '0') {
            amount = pdfAmount;
            
          } else if (bodyAmount !== '0') {
            amount = bodyAmount;
            
          }
          
          // Determine if it's an invoice or purchase-related
          const isInvoice = subject.toLowerCase().includes('invoice') || 
                           subject.toLowerCase().includes('receipt') ||
                           subject.toLowerCase().includes('payment') ||
                           subject.toLowerCase().includes('order') ||
                           subject.toLowerCase().includes('purchase') ||
                           subject.toLowerCase().includes('transaction') ||
                           subject.toLowerCase().includes('bill') ||
                           subject.toLowerCase().includes('statement') ||
                           amount !== '0'; // If we found an amount, it's likely a purchase
          
          // Check if it's promotional based on content
          const isPromotional = subject.toLowerCase().includes('live') ||
                               subject.toLowerCase().includes('edition') ||
                               subject.toLowerCase().includes('grab') ||
                               subject.toLowerCase().includes('off') ||
                               subject.toLowerCase().includes('trendiest') ||
                               subject.toLowerCase().includes('marketplace') ||
                               subject.toLowerCase().includes('seller') ||
                               subject.toLowerCase().includes('discretion') ||
                               emailBody.toLowerCase().includes('offers') ||
                               emailBody.toLowerCase().includes('promotion');
          
          // Override isInvoice if it's promotional
          const finalIsInvoice = isInvoice && !isPromotional;

          // Log each email for debugging

          return {
            id: message.id!,
            subject,
            date: formatDate(date),
            vendor,
            amount,
            isInvoice: finalIsInvoice,
            snippet: emailResponse.data.snippet || '',
          };
        } catch (error) {
          
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      emailData.push(...batchResults.filter(Boolean) as EmailData[]);

      // Removed rate limiting delay
    }

    // Filter out emails with meaningful data and exclude social media notifications
    const filteredEmails = emailData.filter(email => {
      // Must have vendor and subject
      if (!email.vendor || !email.subject || email.subject.length < 5) return false;
      
      // Exclude social media and promotional emails
      const socialMediaKeywords = [
        'facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok',
        'notification', 'comment', 'like', 'share', 'post', 'story',
        'zomato', 'swiggy', 'naukri', 'indeed', 'promotion', 'offer',
        'newsletter', 'update', 'alert', 'reminder', 'live', 'edition',
        'trendiest', 'marketplace', 'seller', 'discretion', 'revoked', 'suspended'
      ];
      
      const subjectLower = email.subject.toLowerCase();
      const vendorLower = email.vendor.toLowerCase();
      
      // Skip if it's clearly social media or promotional
      for (const keyword of socialMediaKeywords) {
        if (subjectLower.includes(keyword) || vendorLower.includes(keyword)) {
          
          return false;
        }
      }
      
      // Additional checks for promotional content
      if (subjectLower.includes('grab') || subjectLower.includes('off') || 
          subjectLower.includes('trendiest') || subjectLower.includes('marketplace') ||
          subjectLower.includes('seller') || subjectLower.includes('discretion')) {
        
        return false;
      }
      
      // Check for suspicious amounts (like ₹96,861 which seems promotional)
      if (email.amount && email.amount !== '0') {
        const amount = parseFloat(email.amount.replace(/,/g, ''));
        if (amount > 50000) { // Filter out extremely high amounts that are likely promotional
          
          return false;
        }
      }
      
      // Must have some indication of being a purchase (amount > 0 or invoice-related)
      // Even if PDF parsing failed, we can still process emails with amounts in subject/body
      const isValidPurchase = email.amount !== '0' || email.isInvoice;
      
      if (isValidPurchase) {
        
      }
      
      return isValidPurchase;
    });

    const response: GmailResponse = {
      emails: filteredEmails,
      totalCount: filteredEmails.length,
      days,
      cached: false,
      timestamp: new Date().toISOString(),
    };

    // Cache the response for 5 minutes
    await setCachedData(cacheKey, response, 300);

    // If no emails were found due to PDF processing errors, try a fallback approach
    if (filteredEmails.length === 0 && emailData.length > 0) {

      const fallbackEmails = emailData.filter(email => 
        email.vendor && email.subject && email.subject.length > 5 && 
        (email.amount !== '0' || email.isInvoice)
      );
      
      if (fallbackEmails.length > 0) {
        
        response.emails = fallbackEmails;
        response.totalCount = fallbackEmails.length;
      }
    }
    
    return NextResponse.json(response);

  } catch (error) {

    if (error instanceof Error) {
      if (error.message.includes('quota')) {
        return NextResponse.json(
          { error: 'Gmail API quota exceeded - Please try again later' },
          { status: 429 }
        );
      }
      if (error.message.includes('unauthorized') || error.message.includes('invalid')) {
        return NextResponse.json(
          { error: 'Authentication failed - Please re-authenticate with Google' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch Gmail data - Please try again later' },
      { status: 500 }
    );
  }
}

// Helper function to extract email body content
function extractEmailBody(payload: any): string {
  if (!payload) return '';
  
  let body = '';
  
  // Handle multipart emails
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
        if (part.body?.data) {
          body += Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }
    }
  } else if (payload.body?.data) {
    // Single part email
    body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }
  
  return body;
}

// Helper function to extract amount from text content
function extractAmountFromText(text: string): string {
  if (!text) return '0';
  
  // Specific patterns for Reliance Digital invoice (highest priority)
  const specificPatterns = [
    /TOTAL\s+(\d+(?:\.\d{2})?)/gi,
    /BALANCE DUE\s+(\d+(?:\.\d{2})?)/gi,
    /EOI Deposit Voucher\s+(\d+(?:\.\d{2})?)/gi,
    /Total\s+(\d+(?:\.\d{2})?)/gi,
    /Amount\s+(\d+(?:\.\d{2})?)/gi
  ];
  
  let maxAmount = 0;
  
  // First try specific patterns (highest priority)
  for (const pattern of specificPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        const amount = parseFloat(match[1]);
        if (amount > maxAmount) {
          maxAmount = amount;
        }
      }
    }
  }
  
  // If no specific patterns found, try general currency patterns
  if (maxAmount === 0) {
    const currencyPatterns = [
      /₹\s*([\d,]+(?:\.\d{2})?)/gi,
      /\$\s*([\d,]+(?:\.\d{2})?)/gi,
      /€\s*([\d,]+(?:\.\d{2})?)/gi,
      /([\d,]+(?:\.\d{2})?)\s*₹/gi,
      /([\d,]+(?:\.\d{2})?)\s*$/gi,
    ];
    
    for (const pattern of currencyPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          const amount = parseFloat(match[1].replace(/,/g, ''));
          if (amount > maxAmount) {
            maxAmount = amount;
          }
        }
      }
    }
    
    const rsPattern = /(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{2})?)/gi;
    const rsMatches = text.matchAll(rsPattern);
    for (const match of rsMatches) {
      if (match[1]) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        if (amount > maxAmount) {
          maxAmount = amount;
        }
      }
    }
  }
  
  return maxAmount > 0 ? maxAmount.toString() : '0';
}

// Helper function to extract amount from PDF attachments
async function extractAmountFromAttachments(payload: any, gmail: any, messageId: string): Promise<string> {
  if (!payload.parts) return '0';
  
  for (const part of payload.parts) {
    if (part.mimeType === 'application/pdf' && part.body?.attachmentId) {
      try {
        const attachment = await gmail.users.messages.attachments.get({
          userId: 'me',
          messageId: messageId,
          id: part.body.attachmentId,
        });
        
        if (attachment.data.body?.data) {
          const pdfData = Buffer.from(attachment.data.body.data, 'base64');
          const pdfText = await extractTextFromPDF(pdfData);
          const amount = extractAmountFromText(pdfText);
          
          if (amount !== '0') {
            
            return amount;
          }
        }
      } catch (error) {
        
        continue;
      }
    }
  }
  
  return '0';
}

// Helper function to extract text from PDF using built-in methods
async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    // Use a simple text extraction method that works reliably
    const bufferString = pdfBuffer.toString('utf8', 0, Math.min(pdfBuffer.length, 10000));
    
    // Look for common PDF text patterns
    const textPatterns = [
      /\/Text\s*<<[^>]*>>/g,
      /\/Contents\s*<<[^>]*>>/g,
      /\([^)]*\)/g,  // Extract text in parentheses
      /[A-Za-z0-9\s.,₹$€]+/g  // Extract alphanumeric content
    ];
    
    let extractedText = '';
    
    for (const pattern of textPatterns) {
      const matches = bufferString.match(pattern);
      if (matches) {
        extractedText += matches.join(' ');
      }
    }
    
    if (extractedText) {
      return extractedText;
    } else {
      return bufferString; // Fallback to raw buffer content
    }
    
  } catch (error) {
    
    return '';
  }
}

// Helper function to extract vendor from "From" field
function extractVendor(from: string): string {
  if (!from) return '';
  
  // Remove email addresses and common prefixes
  let vendor = from.replace(/<[^>]+>/g, '').replace(/"/g, '').trim();
  
  // Remove common email prefixes
  vendor = vendor.replace(/^(noreply|no-reply|donotreply|do-not-reply|support|help|info|contact|hello|hi)\s*[:\-]?\s*/i, '');
  
  // Clean up extra whitespace and punctuation
  vendor = vendor.replace(/\s+/g, ' ').replace(/^\s*[:\-]\s*/, '').trim();
  
  // If empty after cleaning, use a fallback
  if (!vendor || vendor.length < 2) {
    vendor = 'Unknown Vendor';
  }
  
  // Log vendor extraction for debugging

  return vendor;
}

// Helper function to extract amount from subject
function extractAmount(subject: string): string {
  if (!subject) return '0';
  
  // Look for currency patterns (₹, $, €, etc.)
  const currencyPatterns = [
    /₹\s*([\d,]+(?:\.\d{2})?)/i,  // Indian Rupees
    /\$\s*([\d,]+(?:\.\d{2})?)/i, // US Dollars
    /€\s*([\d,]+(?:\.\d{2})?)/i,  // Euros
    /([\d,]+(?:\.\d{2})?)\s*₹/i,  // Amount before ₹
    /([\d,]+(?:\.\d{2})?)\s*$/i,  // Amount at end
  ];
  
  for (const pattern of currencyPatterns) {
    const match = subject.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // Look for "Rs." or "INR" patterns
  const rsPattern = /(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{2})?)/i;
  const rsMatch = subject.match(rsPattern);
  if (rsMatch && rsMatch[1]) {
    return rsMatch[1];
  }
  
  return '0';
}

// Helper function to format date
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Unknown Date';
    }
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Unknown Date';
  }
}
