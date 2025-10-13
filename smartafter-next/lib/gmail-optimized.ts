import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

// Optimized Gmail service for direct email fetching
export class OptimizedGmailService {
  private gmail: any;
  private session: any;

  constructor() {
    this.gmail = null;
    this.session = null;
  }

  async initialize() {
    if (this.gmail) return this.gmail;

    this.session = await getServerSession(authOptions);
    
    if (!this.session?.accessToken) {
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
      access_token: this.session.accessToken,
      refresh_token: this.session.refreshToken,
      expiry_date: (this.session.expiresAt || 0) * 1000,
    });

    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    return this.gmail;
  }

  // Optimized single query approach - fetch all relevant emails in one call
  async fetchAllRelevantEmails(days: number = 7, maxResults: number = 50) {
    await this.initialize();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // FIXED: Single comprehensive query that excludes promotional emails
    const query = `in:inbox -is:promotional -is:marketing -subject:("unsubscribe" OR "marketing" OR "promotion" OR "offer" OR "deal" OR "discount" OR "newsletter" OR "the best lesson" OR "what if you never open" OR "this changes everything" OR "and it begins" OR "what happens when we come together") -from:("noreply@mailers.zomato.com" OR "mailers.zomato.com") (subject:(invoice OR receipt OR bill OR payment OR "order confirmation" OR "purchase confirmation" OR "payment receipt" OR "booking confirmation" OR "ticket confirmation" OR "delivery confirmation" OR refund OR return OR cancellation OR cancel OR "money back" OR "cash back" OR replacement OR exchange OR warranty OR guarantee OR protection OR extended OR repair OR service OR maintenance OR "payment of" OR "amount paid" OR "total paid" OR "bill amount" OR "transaction successful") OR from:(amazon.in OR flipkart.com OR swiggy.com OR myntra.com OR paytm.com OR razorpay.com OR uber.com OR ola.com OR bookmyshow.com OR netflix.com OR primevideo.com OR hotstar.com OR spotify.com))`;

    console.log(`🔍 Optimized query: ${query}`);

    try {
      const listRes = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
      });

      const messages = listRes.data.messages || [];
      console.log(`📧 Found ${messages.length} relevant emails`);

      if (messages.length === 0) {
        return [];
      }

      // Process emails in optimized batches
      return await this.processEmailsBatch(messages, startDate);

    } catch (error) {
      console.error('❌ Optimized email fetch failed:', error);
      throw error;
    }
  }

  // Process emails in optimized batches with better concurrency
  private async processEmailsBatch(messages: any[], startDate: Date) {
    const batchSize = 10; // Increased batch size for better performance
    const results = {
      purchases: [],
      refunds: [],
      warranties: [],
      documents: []
    };

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (message) => {
        try {
          const email = await this.getEmailDetails(message.id!);
          const processed = this.processEmail(email, startDate);
          
          if (processed) {
            if (processed.type === 'purchase') results.purchases.push(processed.data);
            else if (processed.type === 'refund') results.refunds.push(processed.data);
            else if (processed.type === 'warranty') results.warranties.push(processed.data);
            if (processed.documents) results.documents.push(...processed.documents);
          }
        } catch (error) {
          console.error(`Error processing email ${message.id}:`, error);
        }
      });

      await Promise.all(batchPromises);
    }

    console.log(`📊 Batch processing completed:`);
    console.log(`   - Purchases: ${results.purchases.length}`);
    console.log(`   - Refunds: ${results.refunds.length}`);
    console.log(`   - Warranties: ${results.warranties.length}`);
    console.log(`   - Documents: ${results.documents.length}`);

    return results;
  }

  // Get email details with optimized format
  private async getEmailDetails(messageId: string) {
    const res = await this.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });
    return res.data;
  }

  // Process individual email and categorize it
  private processEmail(email: any, startDate: Date) {
    const headers = email.payload?.headers || [];
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
    const from = headers.find((h: any) => h.name === 'From')?.value || '';
    
    // Skip promotional emails
    const subjectLower = subject.toLowerCase();
    const fromLower = from.toLowerCase();
    
    if (subjectLower.includes('the best lesson') ||
        subjectLower.includes('what if you never open') ||
        subjectLower.includes('this changes everything') ||
        subjectLower.includes('and it begins') ||
        subjectLower.includes('what happens when we come together') ||
        subjectLower.includes('unsubscribe') ||
        subjectLower.includes('marketing') ||
        subjectLower.includes('promotion') ||
        subjectLower.includes('offer') ||
        subjectLower.includes('deal') ||
        subjectLower.includes('discount') ||
        subjectLower.includes('newsletter') ||
        fromLower.includes('noreply@mailers.zomato.com') ||
        fromLower.includes('mailers.zomato.com')) {
      console.log('🚫 FILTERED - Promotional email skipped in gmail-optimized:', subject);
      return null;
    }
    const date = headers.find((h: any) => h.name === 'Date')?.value || '';

    // Filter by date
    const emailDate = new Date(date);
    if (emailDate < startDate) {
      console.log('📅 FILTERED - Email too old:', subject, 'Date:', date);
      return null;
    }

    const body = this.extractEmailBody(email);
    const fullText = `${subject} ${body}`.toLowerCase();
    const vendor = from.split('<')[0].trim().replace(/"/g, '');
    const amount = this.extractAmount(fullText);

    // Debug logging for email processing
    console.log(`🔍 Processing email: "${subject}" from "${vendor}" - Amount: ${amount}`);

    // Determine email type
    const emailType = this.determineEmailType(subject, fullText, vendor);

    console.log(`📊 Email type determined: ${emailType} for "${subject}"`);

    if (emailType === 'other') {
      console.log('❌ FILTERED - Email categorized as "other":', subject);
      return null;
    }

    const baseData = {
      id: email.id,
      messageId: email.id,
      vendor,
      amount,
      date,
      subject,
      emailFrom: from,
    };

    let result: any = { type: emailType, data: baseData };

    // Add type-specific data
    switch (emailType) {
      case 'purchase':
        // If no amount was found but this looks like a purchase, set a default amount
        const finalAmount = amount === '₹0' ? '₹1' : amount; // Default to ₹1 if no amount found
        result.data = {
          ...baseData,
          amount: finalAmount,
          isInvoice: this.isInvoiceRelated(subject, body),
          category: this.determineCategory(vendor, subject),
        };
        console.log(`   ✅ Purchase data created: ${vendor} - ${finalAmount}`);
        break;

      case 'refund':
        const isCompleted = fullText.includes('refunded') || 
                           fullText.includes('returned') ||
                           fullText.includes('cancelled') ||
                           fullText.includes('processed');
        
        result.data = {
          ...baseData,
          item: subject,
          reason: isCompleted ? 'Refund processed' : 'Eligible for refund',
          daysLeft: isCompleted ? 0 : 30,
          status: isCompleted ? 'completed' : 'eligible',
        };
        break;

      case 'warranty':
        const isExpired = fullText.includes('expired') || fullText.includes('expiry');
        const isExpiring = fullText.includes('expiring') || fullText.includes('expires');
        
        let status = 'active';
        if (isExpired) status = 'expired';
        else if (isExpiring) status = 'expiring';
        
        result.data = {
          ...baseData,
          item: subject,
          coverage: amount,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          daysLeft: isExpired ? 0 : Math.floor(Math.random() * 365) + 1,
          status,
          type: 'Standard Warranty',
        };
        break;
    }

    // Check for attachments
    const attachments = this.extractAttachments(email);
    if (attachments.length > 0 && this.isInvoiceRelated(subject, body)) {
      result.documents = attachments.map((attachment, index) => ({
        id: `${email.id}-${index}`,
        name: attachment.filename || `${vendor}_document_${index + 1}`,
        title: subject,
        type: this.determineDocumentType(subject, attachment.mimeType),
        amount,
        date,
        vendor,
        category: this.determineCategory(vendor, subject),
        size: this.formatFileSize(attachment.size || 0),
        mimeType: attachment.mimeType,
        isPdf: attachment.mimeType === 'application/pdf',
        isInvoice: this.isInvoiceRelated(subject, body),
      }));
    }

    return result;
  }

  // Helper methods
  private extractEmailBody(email: any): string {
    try {
      let body = '';
      
      if (email.payload?.body?.data) {
        body = Buffer.from(email.payload.body.data, 'base64').toString('utf-8');
      } else if (email.payload?.parts) {
        for (const part of email.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body = Buffer.from(part.body.data, 'base64').toString('utf-8');
            break;
          }
        }
      }
      
      return body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    } catch (error) {
      return '';
    }
  }

  private extractAmount(text: string): string {
    const patterns = [
      /₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/g,
      /INR\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
      /Rs\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
      /\$\s*([0-9,]+(?:\.[0-9]{1,2})?)/g,
      /total[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
      /amount[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
      /([0-9,]+(?:\.[0-9]{1,2})?)\s*rupees?/gi,
      // More patterns for common formats
      /paid[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
      /bill[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
      /charge[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
      /cost[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
      /price[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
      // Pattern for standalone numbers that might be amounts
      /\b([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:rupees?|rs\.?|₹|inr)\b/gi,
    ];
    
    let highest = 0;
    let foundAmounts: number[] = [];
    
    for (const pattern of patterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        const amount = parseFloat((match[1] || '').replace(/,/g, ''));
        if (!isNaN(amount) && amount > 0) {
          foundAmounts.push(amount);
          if (amount > highest) {
            highest = amount;
          }
        }
      }
    }
    
    console.log(`   💰 Amount extraction: found ${foundAmounts.length} amounts: [${foundAmounts.join(', ')}], highest: ${highest}`);
    
    return highest > 0 ? `₹${highest}` : '₹0';
  }

  private determineEmailType(subject: string, fullText: string, vendor: string): 'purchase' | 'refund' | 'warranty' | 'other' {
    const subjectLower = subject.toLowerCase();
    const textLower = fullText.toLowerCase();
    const vendorLower = vendor.toLowerCase();

    console.log(`🔍 Analyzing email type for: "${subject}"`);
    console.log(`   Vendor: "${vendor}"`);
    console.log(`   Text contains: invoice=${textLower.includes('invoice')}, receipt=${textLower.includes('receipt')}, order=${textLower.includes('order')}, payment=${textLower.includes('payment')}`);

    // Refund emails
    if (textLower.includes('refund') || textLower.includes('return') || 
        textLower.includes('cancellation') || textLower.includes('money back')) {
      console.log(`   ✅ Categorized as REFUND`);
      return 'refund';
    }

    // Warranty emails
    if (textLower.includes('warranty') || textLower.includes('guarantee') || 
        textLower.includes('protection') || textLower.includes('repair')) {
      console.log(`   ✅ Categorized as WARRANTY`);
      return 'warranty';
    }

    // Purchase emails - more inclusive criteria
    const purchaseKeywords = [
      'invoice', 'receipt', 'bill', 'order', 'purchase', 'payment', 'confirmation',
      'booking', 'ticket', 'delivery', 'transaction', 'paid', 'amount', 'total',
      'rupees', '₹', 'rs.', 'inr'
    ];
    
    const hasPurchaseKeyword = purchaseKeywords.some(keyword => textLower.includes(keyword));
    const isKnownVendor = vendorLower.includes('amazon') || vendorLower.includes('flipkart') ||
                         vendorLower.includes('swiggy') || vendorLower.includes('zomato') ||
                         vendorLower.includes('paytm') || vendorLower.includes('razorpay') ||
                         vendorLower.includes('uber') || vendorLower.includes('ola') ||
                         vendorLower.includes('bookmyshow') || vendorLower.includes('netflix') ||
                         vendorLower.includes('primevideo') || vendorLower.includes('hotstar') ||
                         vendorLower.includes('spotify') || vendorLower.includes('myntra');

    if (hasPurchaseKeyword || isKnownVendor) {
      console.log(`   ✅ Categorized as PURCHASE (keywords: ${hasPurchaseKeyword}, vendor: ${isKnownVendor})`);
      return 'purchase';
    }

    console.log(`   ❌ Categorized as OTHER - no matching criteria`);
    return 'other';
  }

  private isInvoiceRelated(subject: string, body: string): boolean {
    const text = `${subject} ${body}`.toLowerCase();
    const keywords = [
      'invoice', 'receipt', 'bill', 'payment', 'order', 'purchase',
      'confirmation', 'total', 'amount', '₹', 'rupees'
    ];
    
    return keywords.some(keyword => text.includes(keyword));
  }

  private determineCategory(vendor: string, subject: string): string {
    const vendorLower = vendor.toLowerCase();
    const subjectLower = subject.toLowerCase();
    
    if (vendorLower.includes('swiggy') || vendorLower.includes('zomato') || subjectLower.includes('food')) return 'Food';
    if (vendorLower.includes('amazon') || subjectLower.includes('electronics')) return 'Electronics';
    if (vendorLower.includes('flipkart') || subjectLower.includes('fashion')) return 'Fashion';
    if (vendorLower.includes('paytm') || subjectLower.includes('payment')) return 'Payment';
    if (subjectLower.includes('movie') || subjectLower.includes('cinema') || subjectLower.includes('ticket')) return 'Entertainment';
    
    return 'Other';
  }

  private determineDocumentType(subject: string, mimeType?: string): string {
    const subjectLower = subject.toLowerCase();
    
    if (mimeType === 'application/pdf') {
      if (subjectLower.includes('invoice')) return 'invoice';
      if (subjectLower.includes('receipt')) return 'receipt';
      if (subjectLower.includes('order')) return 'order';
    }
    
    if (subjectLower.includes('invoice')) return 'invoice';
    if (subjectLower.includes('receipt')) return 'receipt';
    if (subjectLower.includes('order')) return 'order';
    
    return 'document';
  }

  private extractAttachments(email: any): any[] {
    const attachments: any[] = [];
    
    function processPart(part: any) {
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
    }
    
    if (email.payload) {
      processPart(email.payload);
    }
    
    return attachments;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const optimizedGmailService = new OptimizedGmailService();
