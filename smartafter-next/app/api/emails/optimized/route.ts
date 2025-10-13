import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { google } from 'googleapis';

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

// Optimized vendor extraction
function extractVendor(from: string): string {
  if (!from) return 'Unknown';
  
  // Remove email addresses and extract company names
  const cleanFrom = from.replace(/<[^>]+>/g, '').replace(/"[^"]*"/g, '').trim();
  
  // Common patterns
  if (cleanFrom.includes('Amazon')) return 'Amazon';
  if (cleanFrom.includes('Flipkart')) return 'Flipkart';
  if (cleanFrom.includes('Myntra')) return 'Myntra';
  if (cleanFrom.includes('Swiggy')) return 'Swiggy';
  if (cleanFrom.includes('Zomato')) return 'Zomato';
  if (cleanFrom.includes('Uber')) return 'Uber';
  if (cleanFrom.includes('Ola')) return 'Ola';
  if (cleanFrom.includes('Paytm')) return 'Paytm';
  if (cleanFrom.includes('PhonePe')) return 'PhonePe';
  if (cleanFrom.includes('Razorpay')) return 'Razorpay';
  
  // Extract first meaningful word
  const words = cleanFrom.split(/\s+/).filter(word => word.length > 2);
  return words[0] || 'Unknown';
}

// Optimized amount extraction
function extractAmount(text: string): string {
  if (!text) return '0';
  
  // Look for currency patterns
  const patterns = [
    /₹\s*([\d,]+\.?\d*)/g,  // ₹1,234.56
    /Rs\.?\s*([\d,]+\.?\d*)/gi,  // Rs. 1,234.56
    /INR\s*([\d,]+\.?\d*)/gi,  // INR 1,234.56
    /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,  // 1,234.56
  ];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      const amount = matches[0].replace(/[^\d.]/g, '');
      const numAmount = parseFloat(amount);
      if (numAmount > 0 && numAmount < 1000000) { // Reasonable range
        return numAmount.toString();
      }
    }
  }
  
  return '0';
}

// Optimized date formatting
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
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

    // Calculate date range - extend to 30 days to find more emails
    const now = new Date();
    const daysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)); // Changed from 7 to 30 days
    const afterDate = daysAgo.toISOString().split('T')[0];

    // More comprehensive search query to find purchase emails
    const searchQuery = `after:${afterDate} (receipt OR invoice OR payment OR order OR purchase OR transaction OR bill OR statement OR confirmation OR "order confirmed" OR "payment successful" OR "thank you for your order" OR "your order" OR "order details" OR "payment receipt" OR "order summary" OR "purchase confirmation" OR "order placed" OR "payment completed" OR "order received" OR "order shipped" OR "delivery confirmation")`;

    const messagesResponse = await gmail.users.messages.list({
      userId: 'me',
      q: searchQuery,
      maxResults: 100, // Increased to find more emails
    });

    const messages = messagesResponse.data.messages || [];

    // If still no messages, try a broader search without subject restrictions
    if (messages.length === 0) {

      const broaderQuery = `after:${afterDate}`;
      const broaderResponse = await gmail.users.messages.list({
        userId: 'me',
        q: broaderQuery,
        maxResults: 50,
      });
      
      const broaderMessages = broaderResponse.data.messages || [];

      if (broaderMessages.length > 0) {
        // Use broader search results
        messages.push(...broaderMessages);
      }
    }

    if (messages.length === 0) {
      // Return empty data instead of sample data
      
      const emptyData: GmailResponse = {
        emails: [],
        totalCount: 0,
        days,
        cached: false,
        timestamp: new Date().toISOString()
      };
      
      return NextResponse.json(emptyData);
    }

    // Process emails in parallel with better error handling
    const emailPromises = messages.slice(0, 20).map(async (message) => {
      try {
        const emailResponse = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date'],
        });

        const headers = emailResponse.data.payload?.headers || [];
        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const from = headers.find(h => h.name === 'From')?.value || '';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        
        // Parse vendor and amount
        const vendor = extractVendor(from);
        const amount = extractAmount(subject);
        
        // Determine if it's an invoice - more comprehensive detection
        const subjectLower = subject.toLowerCase();
        const isInvoice = 
          subjectLower.includes('invoice') || 
          subjectLower.includes('receipt') ||
          subjectLower.includes('payment') ||
          subjectLower.includes('order') ||
          subjectLower.includes('purchase') ||
          subjectLower.includes('transaction') ||
          subjectLower.includes('bill') ||
          subjectLower.includes('statement') ||
          subjectLower.includes('confirmation') ||
          subjectLower.includes('confirmed') ||
          subjectLower.includes('successful') ||
          subjectLower.includes('thank you') ||
          subjectLower.includes('your order') ||
          subjectLower.includes('order details') ||
          subjectLower.includes('order summary') ||
          subjectLower.includes('order placed') ||
          subjectLower.includes('order received') ||
          subjectLower.includes('order shipped') ||
          subjectLower.includes('delivery') ||
          amount !== '0' || // If we found an amount, it's likely a purchase
          vendor.toLowerCase().includes('amazon') ||
          vendor.toLowerCase().includes('flipkart') ||
          vendor.toLowerCase().includes('myntra') ||
          vendor.toLowerCase().includes('swiggy') ||
          vendor.toLowerCase().includes('zomato') ||
          vendor.toLowerCase().includes('uber') ||
          vendor.toLowerCase().includes('ola') ||
          vendor.toLowerCase().includes('paytm') ||
          vendor.toLowerCase().includes('phonepe');

        // Log each email for debugging

        return {
          id: message.id!,
          subject,
          date: formatDate(date),
          vendor,
          amount,
          isInvoice,
          snippet: emailResponse.data.snippet || '',
        };
      } catch (error) {
        
        return null;
      }
    });

    const emailResults = await Promise.all(emailPromises);
    const validEmails = emailResults.filter(Boolean) as EmailData[];
    
    // Filter out promotional emails
    const filteredEmails = validEmails.filter(email => {
      const subjectLower = email.subject.toLowerCase();
      const promotionalKeywords = ['live', 'edition', 'grab', 'off', 'trendiest', 'marketplace', 'seller'];
      return !promotionalKeywords.some(keyword => subjectLower.includes(keyword));
    });

    const response: GmailResponse = {
      emails: filteredEmails,
      totalCount: filteredEmails.length,
      days,
      cached: false,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {

    // Return empty data on error - no sample data
    const fallbackData: GmailResponse = {
      emails: [],
      totalCount: 0,
      days: 7,
      cached: false,
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(fallbackData);
  }
}
