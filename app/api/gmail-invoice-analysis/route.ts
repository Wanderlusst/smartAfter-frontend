import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { createGmailService } from '@/lib/gmailService';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const maxResults = parseInt(searchParams.get('maxResults') || '50');
    const days = parseInt(searchParams.get('days') || '30');
    

    // Create Gmail service
    const gmailService = await createGmailService();
    
    // Search for invoice emails
    const emails = await gmailService.searchInvoiceEmails({
      days,
      maxResults,
      pdfOnly: false, // Include both PDF and non-PDF emails
      includeAttachments: true
    });

    // Transform emails to invoice format
    const invoices = emails.map(email => ({
      messageId: email.messageId,
      subject: email.subject,
      from: email.from,
      date: email.date,
      vendor: email.from.split('<')[0].trim().replace(/"/g, ''),
      amount: extractAmountFromText(`${email.subject} ${email.body}`),
      hasPdfAttachments: email.hasPdfAttachments,
      attachmentCount: email.attachments.length
    }));

    // Calculate summary
    const summary = {
      totalEmails: emails.length,
      emailsWithPdfs: emails.filter(e => e.hasPdfAttachments).length,
      totalAmount: invoices.reduce((sum, inv) => {
        const amount = parseFloat(inv.amount.replace(/[₹,]/g, '')) || 0;
        return sum + amount;
      }, 0),
      averageAmount: 0,
      topVendors: getTopVendors(invoices),
      dateRange: {
        from: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString()
      }
    };

    summary.averageAmount = summary.totalEmails > 0 ? summary.totalAmount / summary.totalEmails : 0;

    return NextResponse.json({
      success: true,
      data: {
        invoices,
        summary
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {

    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Gmail invoice analysis failed'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      searchQuery = 'subject:(invoice OR receipt OR bill OR order OR purchase OR payment)',
      maxResults = 50,
      batchSize = 5,
      analyzeMode = 'search'
    } = body;

    // Create Gmail service
    const gmailService = await createGmailService();
    
    // Search for invoice emails
    const emails = await gmailService.searchInvoiceEmails({
      days: 30,
      maxResults,
      pdfOnly: false,
      includeAttachments: true
    });

    // Transform emails to invoice format
    const invoices = emails.map(email => ({
      messageId: email.messageId,
      subject: email.subject,
      from: email.from,
      date: email.date,
      vendor: email.from.split('<')[0].trim().replace(/"/g, ''),
      amount: extractAmountFromText(`${email.subject} ${email.body}`),
      hasPdfAttachments: email.hasPdfAttachments,
      attachmentCount: email.attachments.length
    }));

    // Calculate summary
    const summary = {
      totalEmails: emails.length,
      emailsWithPdfs: emails.filter(e => e.hasPdfAttachments).length,
      totalAmount: invoices.reduce((sum, inv) => {
        const amount = parseFloat(inv.amount.replace(/[₹,]/g, '')) || 0;
        return sum + amount;
      }, 0),
      averageAmount: 0,
      topVendors: getTopVendors(invoices),
      dateRange: {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString()
      }
    };

    summary.averageAmount = summary.totalEmails > 0 ? summary.totalAmount / summary.totalEmails : 0;

    return NextResponse.json({
      success: true,
      data: {
        invoices,
        summary
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {

    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Gmail invoice analysis failed'
      },
      { status: 500 }
    );
  }
}

// Helper function to extract amount from text
function extractAmountFromText(text: string): string {
  const patterns = [
    /₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/g,
    /INR\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /Rs\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /\$\s*([0-9,]+(?:\.[0-9]{1,2})?)/g,
    /total[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /amount[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
  ];

  let bestAmount = 0;
  let bestAmountStr = '₹0';

  for (const pattern of patterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      const numericMatch = match[0].match(/([0-9,]+(?:\.[0-9]{1,2})?)/);
      if (numericMatch) {
        const amount = parseFloat(numericMatch[1].replace(/,/g, ''));
        if (!isNaN(amount) && amount > bestAmount) {
          bestAmount = amount;
          bestAmountStr = `₹${amount}`;
        }
      }
    }
  }

  return bestAmountStr;
}

// Helper function to get top vendors
function getTopVendors(invoices: any[]): Array<{ vendor: string; count: number; totalAmount: number }> {
  const vendorMap = new Map<string, { count: number; totalAmount: number }>();

  invoices.forEach(invoice => {
    const vendor = invoice.vendor;
    const amount = parseFloat(invoice.amount.replace(/[₹,]/g, '')) || 0;
    
    if (vendorMap.has(vendor)) {
      const existing = vendorMap.get(vendor)!;
      existing.count += 1;
      existing.totalAmount += amount;
    } else {
      vendorMap.set(vendor, { count: 1, totalAmount: amount });
    }
  });

  return Array.from(vendorMap.entries())
    .map(([vendor, data]) => ({ vendor, ...data }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10);
}
