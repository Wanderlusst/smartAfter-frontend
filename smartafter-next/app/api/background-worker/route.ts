import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getGmailClient } from '@/lib/gmail';

const PDF_PARSER_BACKEND_URL = process.env.PDF_PARSER_BACKEND_URL || 'http://localhost:8000';

// In-memory storage for background job status
const backgroundJobs = new Map<string, {
  status: 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  totalEmails: number;
  processedEmails: number;
  startTime: number;
  endTime?: number;
  error?: string;
  results?: unknown[];
}>();

// Helper function to update progress
async function updateProgress(jobId: string, updates: Partial<{
  status: 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  totalEmails: number;
  processedEmails: number;
  error?: string;
  results?: unknown[];
}>) {
  const job = backgroundJobs.get(jobId);
  if (job) {
    Object.assign(job, updates);
    backgroundJobs.set(jobId, job);
    
    // Report to progress API
    try {
      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/background-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: job.status === 'running',
          progress: job.progress,
          message: job.status === 'running' ? `Processing ${job.processedEmails}/${job.totalEmails} emails...` : 'Idle',
          status: job.status === 'running' ? 'syncing' : 'idle',
          documentsFound: job.results?.length || 0
        })
      });
    } catch (error) {
      console.log('Failed to update progress:', error);
    }
  }
}

// Helper function to check if email is a credit card statement
function isCreditCardStatement(subject: string, from: string): boolean {
  const subjectLower = subject.toLowerCase();
  const fromLower = from.toLowerCase();
  
  const creditCardKeywords = [
    'credit card statement', 'card statement', 'credit card', 'statement',
    'bank statement', 'upi rupay', 'hdfc bank', 'icici bank', 'sbi card',
    'axis bank', 'kotak bank', 'credit card bill', 'card bill'
  ];
  
  for (const keyword of creditCardKeywords) {
    if (subjectLower.includes(keyword) || fromLower.includes(keyword)) {
      return true;
    }
  }
  
  const bankDomains = ['hdfcbank.com', 'icicibank.com', 'sbicard.com', 'axisbank.com', 'kotak.com'];
  for (const domain of bankDomains) {
    if (fromLower.includes(domain)) {
      return true;
    }
  }
  
  return false;
}

// Background worker function
async function processEmailsInBackground(jobId: string, gmail: unknown, days: number = 90) {
  try {
    console.log(`🚀 Starting background email processing for ${days} days...`);
    
    // Update job status
    backgroundJobs.set(jobId, {
      status: 'running',
      progress: 0,
      totalEmails: 0,
      processedEmails: 0,
      startTime: Date.now(),
      results: []
    });

    
    // Enhanced query for better invoice detection - EXCLUDING credit card statements
    const query = `in:inbox newer_than:${days}d (invoice OR receipt OR bill OR payment OR order OR booking OR ticket OR confirmation OR "thank you for your order" OR "order confirmation" OR "payment receipt" OR "booking confirmation" OR "ticket confirmation" OR "delivery confirmation" OR "purchase confirmation") -from:facebook.com -from:myntra.com -from:zomato.com -from:naukri.com -from:microsoft.com -subject:"notification" -subject:"commented" -subject:"posted" -subject:"shared" -subject:"sale" -subject:"offer" -subject:"promotion" -subject:"credit card" -subject:"statement" -subject:"bank" -subject:"card statement" -subject:"credit card statement" -from:*bank* -from:*card* -from:*credit*`;
    
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 500, // Process more emails for 3 months
    });
    
    const messages = listRes.data.messages || [];
    console.log(`📧 Found ${messages.length} emails to process in background`);
    
    // Update total emails
    const job = backgroundJobs.get(jobId);
    if (job) {
      job.totalEmails = messages.length;
      backgroundJobs.set(jobId, job);
    }
    
    if (!messages.length) {
      backgroundJobs.set(jobId, {
        ...job!,
        status: 'completed',
        progress: 100,
        endTime: Date.now()
      });
      return;
    }

    const results: unknown[] = [];
    let processed = 0;
    
    // Process emails in smaller batches to avoid overwhelming the system
    const batchSize = 5;
    let index = 0;
    
    while (index < messages.length) {
      const batch = messages.slice(index, index + batchSize);
      
      const batchPromises = batch.map(async (message: { id: string }) => {
        try {
          // Get full message details
          const fullRes = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          });
          
          const headers = fullRes.data.payload?.headers || [];
          const subject = headers.find((h: { name: string; value: string }) => h.name === 'Subject')?.value || '';
          const from = headers.find((h: { name: string; value: string }) => h.name === 'From')?.value || '';
          const date = headers.find((h: { name: string; value: string }) => h.name === 'Date')?.value || '';
          
          // Check if this is a credit card statement and skip it
          if (isCreditCardStatement(subject, from)) {
            console.log(`🚫 Skipping credit card statement: ${subject}`);
            return null;
          }
          
          const emailBody = getEmailBody(fullRes.data);
          const fullText = `${subject} ${emailBody}`.toLowerCase();
          
          // Skip junk emails
          if (fullText.includes('facebook') || 
              fullText.includes('unsubscribe') || 
              fullText.includes('marketing') ||
              fullText.includes('promotion') ||
              fullText.includes('offer') ||
              fullText.includes('sale')) {
            return null;
          }
          
          // Extract PDF attachments
          const pdfAttachments = await extractPdfAttachments(gmail, message.id, fullRes.data.payload);
          
          if (pdfAttachments.length === 0) {
            return null; // Skip emails without PDF attachments
          }
          
          // Process with backend
          const emailData = {
            messageId: message.id,
            subject,
            from,
            date,
            body: emailBody,
            pdfAttachments: pdfAttachments
          };
          
          const response = await fetch(`${PDF_PARSER_BACKEND_URL}/process-email-data`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email_data: emailData,
              process_all_attachments: true
            }),
            signal: AbortSignal.timeout(30000)
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              return {
                ...result.data,
                messageId: message.id,
                subject,
                from,
                date,
                attachmentId: pdfAttachments[0]?.attachmentId,
                attachmentFilename: pdfAttachments[0]?.filename,
                attachmentMimeType: pdfAttachments[0]?.mimeType,
                attachmentSize: pdfAttachments[0]?.size
              };
            }
          }
          
          return null;
        } catch (error) {
          console.error(`Error processing email ${message.id}:`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter(Boolean);
      results.push(...validResults);
      
      processed += batch.length;
      
      // Update progress
      const progress = Math.round((processed / messages.length) * 100);
      const job = backgroundJobs.get(jobId);
      if (job) {
        job.progress = progress;
        job.processedEmails = processed;
        job.results = results;
        backgroundJobs.set(jobId, job);
      }
      
      console.log(`📊 Background progress: ${progress}% (${processed}/${messages.length})`);
      
      // Add delay between batches to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      index += batchSize;
    }
    
    // Mark job as completed
    const completedJob = backgroundJobs.get(jobId);
    if (completedJob) {
      completedJob.status = 'completed';
      completedJob.progress = 100;
      completedJob.endTime = Date.now();
      completedJob.results = results;
      backgroundJobs.set(jobId, completedJob);
    }
    
    console.log(`✅ Background email processing completed! Processed ${results.length} valid documents.`);
    
  } catch (error) {
    console.error('❌ Background email processing failed:', error);
    const failedJob = backgroundJobs.get(jobId);
    if (failedJob) {
      failedJob.status = 'failed';
      failedJob.error = error instanceof Error ? error.message : 'Unknown error';
      failedJob.endTime = Date.now();
      backgroundJobs.set(jobId, failedJob);
    }
  }
}

// Helper functions
function getEmailBody(payload: { body?: { data?: string }; parts?: Array<{ mimeType: string; body?: { data?: string }; parts?: unknown[] }> }): string {
  if (!payload) return '';
  
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString();
  }
  
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString();
      }
    }
  }
  
  return '';
}

async function extractPdfAttachments(gmail: unknown, messageId: string, payload: { mimeType?: string; filename?: string; body?: { attachmentId?: string }; parts?: unknown[] }): Promise<Array<{ filename: string; attachmentId: string; mimeType: string; data: string } | null>> {
  const attachments: Array<{ filename: string; attachmentId: string }> = [];
  
  if (!payload) return attachments;
  
  const processPart = (part: { mimeType?: string; filename?: string; body?: { attachmentId?: string }; parts?: unknown[] }) => {
    if (part.mimeType === 'application/pdf' && part.filename) {
      attachments.push({
        filename: part.filename,
        attachmentId: part.body.attachmentId
      });
    }
    
    if (part.parts) {
      part.parts.forEach(processPart);
    }
  };
  
  processPart(payload);
  
  // Download attachment data
  const attachmentPromises = attachments.map(async (attachment) => {
    try {
      const attachmentResponse = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: messageId,
        id: attachment.attachmentId
      });
      
      const data = attachmentResponse.data.data;
      if (data) {
        return {
          filename: attachment.filename,
          attachmentId: attachment.attachmentId,
          mimeType: 'application/pdf',
          data: data
        };
      }
    } catch (error) {
      console.error(`Error downloading attachment ${attachment.filename}:`, error);
    }
    return null;
  });
  
    const results = await Promise.all(attachmentPromises);
    return results.filter((result): result is { filename: string; attachmentId: string; mimeType: string; data: string } => result !== null);
}

// API Routes
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { days = 90 } = await request.json();
    const jobId = `bg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🚀 Starting background job ${jobId} for ${days} days`);
    
    // Start background processing (don't await)
    const gmail = await getGmailClient();
    processEmailsInBackground(jobId, gmail, days).catch(error => {
      console.error('Background job failed:', error);
    });
    
    return NextResponse.json({
      success: true,
      jobId,
      message: 'Background email processing started'
    });
    
  } catch (error) {
    console.error('Error starting background job:', error);
    return NextResponse.json(
      { error: 'Failed to start background job' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    
    if (jobId) {
      // Get specific job status
      const job = backgroundJobs.get(jobId);
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        job: {
          jobId,
          ...job,
          duration: job.endTime ? job.endTime - job.startTime : Date.now() - job.startTime
        }
      });
    } else {
      // Get all jobs
      const allJobs = Array.from(backgroundJobs.entries()).map(([id, job]) => ({
        jobId: id,
        ...job,
        duration: job.endTime ? job.endTime - job.startTime : Date.now() - job.startTime
      }));
      
      return NextResponse.json({
        success: true,
        jobs: allJobs
      });
    }
    
  } catch (error) {
    console.error('Error getting job status:', error);
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    
    if (jobId) {
      backgroundJobs.delete(jobId);
      return NextResponse.json({
        success: true,
        message: 'Job deleted'
      });
    } else {
      backgroundJobs.clear();
      return NextResponse.json({
        success: true,
        message: 'All jobs cleared'
      });
    }
    
  } catch (error) {
    console.error('Error deleting job:', error);
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}
