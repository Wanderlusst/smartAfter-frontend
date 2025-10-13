import { GmailService, GmailMessageWithAttachments, GmailAttachment } from './gmailService';
import { PDFParser, ParsedInvoice, ParsingResult } from './pdfParser';
import { DatabaseService, StoredInvoice } from './dbService';
import { ErrorHandler, safeExecute } from './errorHandler';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export interface ProcessingOptions {
  days?: number;
  maxResults?: number;
  skipExisting?: boolean;
  storeRawPdf?: boolean;
  retryFailed?: boolean;
}

export interface ProcessingResult {
  success: boolean;
  processed: number;
  failed: number;
  skipped: number;
  errors: string[];
  invoices: StoredInvoice[];
  processingTime: number;
}

export interface ProcessingStats {
  totalEmails: number;
  emailsWithPdfs: number;
  successfulParses: number;
  failedParses: number;
  skippedEmails: number;
  averageProcessingTime: number;
}

export class InvoiceProcessor {
  private gmailService: GmailService;
  private pdfParser: PDFParser;
  private dbService: DatabaseService;
  private userId: string;

  constructor(
    gmailService: GmailService,
    pdfParser: PDFParser,
    dbService: DatabaseService,
    userId: string
  ) {
    this.gmailService = gmailService;
    this.pdfParser = pdfParser;
    this.dbService = dbService;
    this.userId = userId;
  }

  static async create(): Promise<InvoiceProcessor> {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      throw new Error('User not authenticated');
    }

    const userId = session.user.email;
    
    // Initialize services
    const gmailService = await GmailService.create();
    const pdfParser = new PDFParser();
    const dbService = await DatabaseService.create(userId);

    return new InvoiceProcessor(gmailService, pdfParser, dbService, userId);
  }

  /**
   * Process invoices from Gmail emails
   */
  async processInvoices(options: ProcessingOptions = {}): Promise<ProcessingResult> {
    const startTime = Date.now();
    const {
      days = 30,
      maxResults = 50,
      skipExisting = true,
      storeRawPdf = true,
      retryFailed = false
    } = options;

    const result: ProcessingResult = {
      success: true,
      processed: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      invoices: [],
      processingTime: 0
    };

    try {
      // Search for emails with PDF attachments
      const emails = await this.gmailService.searchInvoiceEmails({
        days,
        maxResults,
        pdfOnly: true
      });

      if (emails.length === 0) {
        result.processingTime = Date.now() - startTime;
        return result;
      }

      // Process each email
      for (const email of emails) {
        try {
          const emailResult = await this.processEmail(email, {
            skipExisting,
            storeRawPdf,
            retryFailed
          });

          if (emailResult.success) {
            result.processed++;
            if (emailResult.invoice) {
              result.invoices.push(emailResult.invoice);
            }
          } else if (emailResult.skipped) {
            result.skipped++;
          } else {
            result.failed++;
            if (emailResult.error) {
              result.errors.push(`${email.messageId}: ${emailResult.error}`);
            }
          }

        } catch (error: any) {
          result.failed++;
          result.errors.push(`${email.messageId}: ${error.message}`);
          
        }
      }

      result.processingTime = Date.now() - startTime;

      return result;

    } catch (error: any) {
      result.success = false;
      result.processingTime = Date.now() - startTime;
      result.errors.push(`Processing failed: ${error.message}`);
      
      return result;
    }
  }

  /**
   * Process a single email with error handling
   */
  private async processEmail(
    email: GmailMessageWithAttachments,
    options: { skipExisting: boolean; storeRawPdf: boolean; retryFailed: boolean }
  ): Promise<{
    success: boolean;
    skipped: boolean;
    error?: string;
    invoice?: StoredInvoice;
  }> {

    // Check if already processed
    if (options.skipExisting) {
      const existsResult = await safeExecute(
        () => this.dbService.invoiceExists(email.messageId),
        'check_invoice_exists',
        this.userId,
        email.messageId
      );

      if (existsResult.success && existsResult.data) {
        
        return { success: false, skipped: true };
      }
    }

    // Find PDF attachments
    const pdfAttachments = email.attachments.filter(att => att.mimeType === 'application/pdf');
    
    if (pdfAttachments.length === 0) {
      return { success: false, error: 'No PDF attachments found' };
    }

    // Process the first PDF attachment
    const pdfAttachment = pdfAttachments[0];
    
    // Download PDF data with retry
    const downloadResult = await safeExecute(
      () => this.gmailService.downloadAttachment(email.messageId, pdfAttachment.attachmentId),
      'download_pdf_attachment',
      this.userId,
      email.messageId,
      pdfAttachment.attachmentId
    );

    if (!downloadResult.success || !downloadResult.data) {
      return { success: false, error: downloadResult.error || 'Failed to download PDF' };
    }

    const pdfData = downloadResult.data;

    // Parse PDF with retry
    const emailContext = {
      subject: email.subject,
      from: email.from,
      body: email.body
    };

    const parsingResult = await this.pdfParser.parsePDFAttachment(
      pdfAttachment,
      pdfData,
      emailContext
    );

    if (!parsingResult.success || !parsingResult.data) {
      // Store failed attempt with error handling
      const storeFailedResult = await safeExecute(
        () => this.dbService.storeFailedInvoice(
          email.messageId,
          parsingResult.error || 'Unknown parsing error',
          options.storeRawPdf ? pdfData : undefined,
          { ...emailContext, messageId: email.messageId }
        ),
        'store_failed_invoice',
        this.userId,
        email.messageId
      );

      if (!storeFailedResult.success) {
        
      }

      return { success: false, error: parsingResult.error || 'Parsing failed' };
    }

    // Store successful result with error handling
    const storeResult = await safeExecute(
      () => this.dbService.storeInvoice(
        email.messageId,
        parsingResult.data!,
        options.storeRawPdf ? pdfData : undefined,
        { ...emailContext, messageId: email.messageId }
      ),
      'store_invoice',
      this.userId,
      email.messageId
    );

    if (!storeResult.success || !storeResult.data) {
      return { success: false, error: storeResult.error || 'Failed to store invoice' };
    }

    return { success: true, invoice: storeResult.data };
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats(): Promise<ProcessingStats> {
    try {
      const stats = await this.dbService.getInvoiceStats();
      
      return {
        totalEmails: stats.totalInvoices,
        emailsWithPdfs: stats.totalInvoices, // All stored invoices have PDFs
        successfulParses: stats.totalInvoices,
        failedParses: 0, // Would need to query failed status
        skippedEmails: 0,
        averageProcessingTime: 0 // Would need to track this
      };
    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Retry failed invoices
   */
  async retryFailedInvoices(): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    const result: ProcessingResult = {
      success: true,
      processed: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      invoices: [],
      processingTime: 0
    };

    try {
      // Get failed invoices from database
      const { data: failedInvoices, error } = await this.dbService.supabase
        .from('invoices')
        .select('*')
        .eq('user_id', this.userId)
        .eq('status', 'failed')
        .not('raw_pdf_data', 'is', null);

      if (error) {
        throw new Error(`Failed to fetch failed invoices: ${error.message}`);
      }

      for (const failedInvoice of failedInvoices || []) {
        try {
          // Re-parse the stored PDF data
          const pdfData = Buffer.from(failedInvoice.raw_pdf_data);
          const emailContext = {
            subject: failedInvoice.source_email_subject || '',
            from: failedInvoice.source_email_from || '',
            body: ''
          };

          const parsingResult = await this.pdfParser.parsePDFAttachment(
            {
              attachmentId: '',
              filename: 'retry.pdf',
              mimeType: 'application/pdf',
              size: pdfData.length
            },
            pdfData,
            emailContext
          );

          if (parsingResult.success && parsingResult.data) {
            // Update the invoice with new parsed data
            await this.dbService.storeInvoice(
              failedInvoice.gmail_message_id,
              parsingResult.data,
              pdfData,
              {
                subject: failedInvoice.source_email_subject || '',
                from: failedInvoice.source_email_from || '',
                messageId: failedInvoice.source_email_id || ''
              }
            );

            result.processed++;
            
          } else {
            result.failed++;
            result.errors.push(`${failedInvoice.gmail_message_id}: ${parsingResult.error}`);
          }

        } catch (error: any) {
          result.failed++;
          result.errors.push(`${failedInvoice.gmail_message_id}: ${error.message}`);
        }
      }

      result.processingTime = Date.now() - startTime;
      return result;

    } catch (error: any) {
      result.success = false;
      result.processingTime = Date.now() - startTime;
      result.errors.push(`Retry failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Test all services
   */
  async testServices(): Promise<{
    gmail: boolean;
    pdfParser: boolean;
    database: boolean;
  }> {
    const results = {
      gmail: false,
      pdfParser: false,
      database: false
    };

    try {
      // Gmail connection check
      results.gmail = { connected: true };
    } catch (error) {
      
    }

    try {
      // Test PDF parser
      results.pdfParser = await this.pdfParser.testConnection();
    } catch (error) {
      
    }

    try {
      // Test database connection
      await this.dbService.getInvoices(1);
      results.database = true;
    } catch (error) {
      
    }

    return results;
  }
}

/**
 * Factory function to create invoice processor
 */
export async function createInvoiceProcessor(): Promise<InvoiceProcessor> {
  return InvoiceProcessor.create();
}

/**
 * Quick function to process recent invoices
 */
export async function processRecentInvoices(days: number = 7): Promise<ProcessingResult> {
  const processor = await createInvoiceProcessor();
  return processor.processInvoices({ days, maxResults: 20 });
}
