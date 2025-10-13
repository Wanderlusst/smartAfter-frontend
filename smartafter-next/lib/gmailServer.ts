// Server-only Gmail service - prevents client-side imports
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  body: string;
  hasPdfAttachments: boolean;
  pdfAttachments?: Array<{
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
  }>;
}

export interface GmailSearchOptions {
  maxResults?: number;
  includeAttachments?: boolean;
  pdfOnly?: boolean;
  daysBack?: number;
}

export class GmailServerService {
  private gmail: any;
  private userId: string;

  constructor(gmail: any, userId: string) {
    this.gmail = gmail;
    this.userId = userId;
  }

  async searchInvoiceEmails(options: GmailSearchOptions = {}): Promise<GmailMessage[]> {
    const {
      maxResults = 50,
      includeAttachments = true,
      pdfOnly = false,
      daysBack = 7
    } = options;

    try {
      // Calculate date range - FIXED: Use proper date arithmetic
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (daysBack * 24 * 60 * 60 * 1000));
      
      const startDateStr = startDate.toISOString().split('T')[0];
      // Add 1 day to endDate to make it inclusive of today
      const endDatePlusOne = new Date(endDate.getTime() + (24 * 60 * 60 * 1000));
      const endDateStr = endDatePlusOne.toISOString().split('T')[0];

      // Build search query - FIXED: Use inclusive date range
      let query = `in:primary after:${startDateStr} before:${endDateStr}`;
      
      if (pdfOnly) {
        query += ' has:attachment filename:pdf';
      } else if (includeAttachments) {
        query += ' has:attachment';
      }

      // Add vendor and subject filters
      query += ' (subject:(invoice OR receipt OR bill OR order OR purchase OR payment OR confirmation OR "thank you" OR "order placed" OR "delivery" OR "shipped") OR from:(amazon.in OR flipkart.com OR swiggy.com OR zomato.com OR myntra.com OR paytm.com OR razorpay.com OR uber.com OR ola.com OR bookmyshow.com OR netflix.com OR hotstar.com OR amazon.com OR google.com OR apple.com))';

      // Search for messages
      const response = await this.gmail.users.messages.list({
        userId: this.userId,
        q: query,
        maxResults: maxResults
      });

      const messages = response.data.messages || [];

      // If no results with attachment filter, try broader search
      if (!messages.length && (pdfOnly || includeAttachments)) {

        const broaderQuery = `in:primary after:${startDateStr} before:${endDateStr} (subject:(invoice OR receipt OR bill OR order OR purchase OR payment) OR from:(amazon.in OR flipkart.com OR swiggy.com OR zomato.com OR myntra.com OR paytm.com))`;
        
        const broaderResponse = await this.gmail.users.messages.list({
          userId: this.userId,
          q: broaderQuery,
          maxResults: maxResults
        });

        const broaderMessages = broaderResponse.data.messages || [];

        if (broaderMessages.length > 0) {
          return this.processMessages(broaderMessages);
        }
      }

      return this.processMessages(messages);

    } catch (error: any) {
      
      throw new Error(`Gmail search failed: ${error.message}`);
    }
  }

  private async processMessages(messages: any[]): Promise<GmailMessage[]> {
    const processedMessages: GmailMessage[] = [];

    for (const message of messages.slice(0, 10)) { // Limit to 10 for performance
      try {
        const messageDetails = await this.gmail.users.messages.get({
          userId: this.userId,
          id: message.id,
          format: 'full'
        });

        const processed = this.parseEmailContent(messageDetails.data);
        if (processed) {
          processedMessages.push(processed);
        }
      } catch (error) {
        
      }
    }

    return processedMessages;
  }

  private parseEmailContent(message: any): GmailMessage | null {
    try {
      const headers = message.payload.headers;
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      const date = headers.find((h: any) => h.name === 'Date')?.value || '';

      // Extract body text
      let body = '';
      if (message.payload.body?.data) {
        body = Buffer.from(message.payload.body.data, 'base64').toString();
      } else if (message.payload.parts) {
        for (const part of message.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body += Buffer.from(part.body.data, 'base64').toString();
          }
        }
      }

      // Check for PDF attachments
      const pdfAttachments: Array<{
        filename: string;
        mimeType: string;
        size: number;
        attachmentId: string;
      }> = [];

      if (message.payload.parts) {
        for (const part of message.payload.parts) {
          if (part.filename && part.filename.toLowerCase().endsWith('.pdf')) {
            pdfAttachments.push({
              filename: part.filename,
              mimeType: part.mimeType,
              size: part.body?.size || 0,
              attachmentId: part.body?.attachmentId || ''
            });
          }
        }
      }

      return {
        id: message.id,
        threadId: message.threadId,
        subject,
        from,
        date,
        body,
        hasPdfAttachments: pdfAttachments.length > 0,
        pdfAttachments: pdfAttachments.length > 0 ? pdfAttachments : undefined
      };

    } catch (error) {
      
      return null;
    }
  }

  async downloadAttachment(messageId: string, attachmentId: string): Promise<Buffer> {
    try {
      const response = await this.gmail.users.messages.attachments.get({
        userId: this.userId,
        messageId: messageId,
        id: attachmentId
      });

      return Buffer.from(response.data.data, 'base64');
    } catch (error: any) {
      
      throw new Error(`Failed to download attachment: ${error.message}`);
    }
  }
}

export async function createGmailServerService(): Promise<GmailServerService | null> {
  try {
    // Check if we're on server side
    if (typeof window !== 'undefined') {
      
      return null;
    }

    // Get session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      
      return null;
    }

    // Check environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      
      return null;
    }

    // Check for access token
    const accessToken = (session as any).accessToken;
    const refreshToken = (session as any).refreshToken;

    if (!accessToken) {
      
      return null;
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: ((session as any).expiresAt || 0) * 1000,
    });

    // Create Gmail client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    return new GmailServerService(gmail, 'me');

  } catch (error: any) {
    
    return null;
  }
}
