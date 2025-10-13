import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { createServerClient } from '@/app/lib/supabaseClient';

// Ensure we're in a server environment
if (typeof window !== 'undefined') {
  throw new Error('Gmail service functions can only be called on the server side');
}

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

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

export interface GmailAttachment {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
  data?: Buffer;
}

export interface GmailMessageWithAttachments {
  id: string;
  messageId: string;
  subject: string;
  from: string;
  date: string;
  body: string;
  attachments: GmailAttachment[];
  hasPdfAttachments: boolean;
}

export interface InvoiceSearchOptions {
  days?: number;
  maxResults?: number;
  includeAttachments?: boolean;
  pdfOnly?: boolean;
}

export class GmailService {
  private gmail: any;
  private userId: string;

  constructor(gmail: any, userId: string) {
    this.gmail = gmail;
    this.userId = userId;
  }

  static async create(): Promise<GmailService> {
    const session = await getServerSession(authOptions) as ExtendedSession | null;
    
    if (!session?.accessToken) {
      throw new Error('Not authenticated - Please log in with your Google account');
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth credentials not configured');
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

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const userId = session.user?.email || 'unknown';

    return new GmailService(gmail, userId);
  }

  /**
   * Search for emails with PDF attachments containing invoices/receipts
   */
  async searchInvoiceEmails(options: InvoiceSearchOptions = {}): Promise<GmailMessageWithAttachments[]> {
    const {
      days = 30,
      maxResults = 50,
      includeAttachments = true,
      pdfOnly = true
    } = options;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

    const startDateStr = startDate.toISOString().split('T')[0];
    // Add 1 day to endDate to make it inclusive of today
    const endDatePlusOne = new Date(endDate.getTime() + (24 * 60 * 60 * 1000));
    const endDateStr = endDatePlusOne.toISOString().split('T')[0];

    // FIXED: Build search query using working patterns
    let query = `in:inbox after:${startDateStr} before:${endDateStr}`; // Use inbox with date filter
    
    if (pdfOnly) {
      query += ' has:attachment filename:pdf';
    } else if (includeAttachments) {
      query += ' has:attachment';
    }

    // Add invoice-related keywords - make it more inclusive
    query += ' (subject:(invoice OR receipt OR bill OR order OR purchase OR payment OR confirmation OR "thank you" OR "order placed" OR "delivery" OR "shipped") OR from:(amazon.in OR flipkart.com OR swiggy.com OR zomato.com OR myntra.com OR paytm.com OR razorpay.com OR uber.com OR ola.com OR bookmyshow.com OR netflix.com OR hotstar.com OR amazon.com OR google.com OR apple.com))';

    try {
      const listRes = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
      });

      const messages = listRes.data.messages || [];

      // If no results and we were looking for attachments, try a broader search
      if (!messages.length && (pdfOnly || includeAttachments)) {
        
        const broaderQuery = `in:inbox after:${startDateStr} before:${endDateStr} (subject:(invoice OR receipt OR bill OR order OR purchase OR payment) OR from:(amazon.in OR flipkart.com OR swiggy.com OR zomato.com OR myntra.com OR paytm.com))`;
        
        const broaderRes = await this.gmail.users.messages.list({
          userId: 'me',
          q: broaderQuery,
          maxResults,
        });
        
        const broaderMessages = broaderRes.data.messages || [];

        if (broaderMessages.length > 0) {
          // Process the broader results
          const results: GmailMessageWithAttachments[] = [];
          const batchSize = 5;
          
          for (let i = 0; i < broaderMessages.length; i += batchSize) {
            const batch = broaderMessages.slice(i, i + batchSize);
            const batchResults = await Promise.all(
              batch.map(msg => this.processMessage(msg.id!))
            );
            results.push(...batchResults.filter(Boolean));
            
            if (i + batchSize < broaderMessages.length) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }

          return results;
        }
      }

      if (!messages.length) {
        return [];
      }

      // Process messages in batches
      const results: GmailMessageWithAttachments[] = [];
      const batchSize = 5;
      
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(msg => this.processMessage(msg.id!))
        );
        results.push(...batchResults.filter(Boolean));
        
        // Add delay to avoid rate limiting
        if (i + batchSize < messages.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      return results;

    } catch (error: any) {
      
      throw new Error(`Gmail search failed: ${error.message}`);
    }
  }

  /**
   * Process a single Gmail message and extract attachments
   */
  private async processMessage(messageId: string): Promise<GmailMessageWithAttachments | null> {
    try {
      const res = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const message = res.data;
      const headers = message.payload?.headers || [];
      
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      const date = headers.find((h: any) => h.name === 'Date')?.value || '';

      // Extract body text
      const body = this.extractBodyText(message.payload);

      // Extract attachments
      const attachments = this.extractAttachments(message.payload);
      const pdfAttachments = attachments.filter(att => att.mimeType === 'application/pdf');

      // Only return messages with PDF attachments if pdfOnly is true
      if (pdfAttachments.length === 0) {
        return null;
      }

      return {
        id: message.id,
        messageId: message.id,
        subject,
        from,
        date,
        body,
        attachments,
        hasPdfAttachments: pdfAttachments.length > 0
      };

    } catch (error) {
      
      return null;
    }
  }

  /**
   * Extract text content from email body
   */
  private extractBodyText(payload: any): string {
    let bodyText = '';

    if (payload.body?.data) {
      bodyText = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    } else if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          bodyText = Buffer.from(part.body.data, 'base64').toString('utf-8');
          break;
        } else if (part.mimeType === 'text/html' && part.body?.data) {
          const htmlText = Buffer.from(part.body.data, 'base64').toString('utf-8');
          // Strip HTML tags for text analysis
          bodyText = htmlText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
          break;
        }
      }
    }

    return bodyText;
  }

  /**
   * Extract attachment information from email payload
   */
  private extractAttachments(payload: any): GmailAttachment[] {
    const attachments: GmailAttachment[] = [];

    const processPart = (part: any) => {
      if (part.body?.attachmentId) {
        attachments.push({
          attachmentId: part.body.attachmentId,
          filename: part.filename || 'attachment',
          mimeType: part.mimeType || 'application/octet-stream',
          size: part.body.size || 0,
        });
      }

      if (part.parts) {
        part.parts.forEach(processPart);
      }
    };

    if (payload) {
      processPart(payload);
    }

    return attachments;
  }

  /**
   * Download attachment data from Gmail
   */
  async downloadAttachment(messageId: string, attachmentId: string): Promise<Buffer> {
    try {
      const res = await this.gmail.users.messages.attachments.get({
        userId: 'me',
        messageId,
        id: attachmentId,
      });

      const data = res.data.data;
      if (!data) {
        throw new Error('No attachment data found');
      }

      return Buffer.from(data, 'base64');

    } catch (error: any) {
      
      throw new Error(`Failed to download attachment: ${error.message}`);
    }
  }

  /**
   * Get paginated results for older emails
   */
  async getOlderEmails(
    beforeDate: Date,
    pageSize: number = 50,
    pageToken?: string
  ): Promise<{ messages: GmailMessageWithAttachments[]; nextPageToken?: string }> {
    const beforeDateStr = beforeDate.toISOString().split('T')[0];
    const query = `in:primary before:${beforeDateStr} has:attachment filename:pdf (subject:(invoice OR receipt OR bill OR order OR purchase OR payment))`;

    try {
      const listRes = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: pageSize,
        pageToken,
      });

      const messages = listRes.data.messages || [];
      if (!messages.length) {
        return { messages: [] };
      }

      // Process messages
      const results: GmailMessageWithAttachments[] = [];
      const batchSize = 3;
      
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(msg => this.processMessage(msg.id!))
        );
        results.push(...batchResults.filter(Boolean));
        
        if (i + batchSize < messages.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      const nextToken = typeof listRes.data.nextPageToken === 'string' ? listRes.data.nextPageToken : undefined;
      return { messages: results, nextPageToken: nextToken };

    } catch (error: any) {
      
      throw new Error(`Failed to get older emails: ${error.message}`);
    }
  }

  /**
   * Check if user has Gmail access
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.gmail.users.getProfile({ userId: 'me' });
      return true;
    } catch (error) {
      
      return false;
    }
  }
}

/**
 * Factory function to create Gmail service instance
 */
export async function createGmailService(): Promise<GmailService> {
  return GmailService.create();
}

/**
 * Quick function to search for recent invoice emails
 */
export async function searchRecentInvoices(days: number = 7): Promise<GmailMessageWithAttachments[]> {
  const gmailService = await createGmailService();
  return gmailService.searchInvoiceEmails({ days, maxResults: 30, pdfOnly: true });
}
