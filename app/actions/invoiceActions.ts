'use server';

import { createInvoiceProcessor } from '@/lib/invoiceProcessor';
import { createDatabaseService } from '@/lib/dbService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { revalidatePath } from 'next/cache';

export interface ProcessingOptions {
  days?: number;
  maxResults?: number;
  skipExisting?: boolean;
  storeRawPdf?: boolean;
  retryFailed?: boolean;
}

export async function processInvoicesAction(options: ProcessingOptions = {}) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      throw new Error('Not authenticated');
    }

    const processor = await createInvoiceProcessor();
    const result = await processor.processInvoices(options);

    // Revalidate the invoices page to show updated data
    revalidatePath('/invoices');
    revalidatePath('/dashboard');

    return {
      success: true,
      result
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

export async function getInvoiceStatsAction() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      throw new Error('Not authenticated');
    }

    const dbService = await createDatabaseService(session.user.email);
    const stats = await dbService.getInvoiceStats();
    const warrantyAlerts = await dbService.getWarrantyAlerts();

    return {
      success: true,
      stats,
      warrantyAlerts
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

export async function getInvoicesAction(limit: number = 50, offset: number = 0) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      throw new Error('Not authenticated');
    }

    const dbService = await createDatabaseService(session.user.email);
    const invoices = await dbService.getInvoices(limit, offset);

    return {
      success: true,
      invoices
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

export async function deleteInvoiceAction(invoiceId: string) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      throw new Error('Not authenticated');
    }

    const dbService = await createDatabaseService(session.user.email);
    const success = await dbService.deleteInvoice(invoiceId);

    if (success) {
      // Revalidate the invoices page
      revalidatePath('/invoices');
      revalidatePath('/dashboard');
    }

    return {
      success,
      message: success ? 'Invoice deleted successfully' : 'Failed to delete invoice'
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

export async function retryFailedInvoicesAction() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      throw new Error('Not authenticated');
    }

    const processor = await createInvoiceProcessor();
    const result = await processor.retryFailedInvoices();

    // Revalidate the invoices page
    revalidatePath('/invoices');
    revalidatePath('/dashboard');

    return {
      success: true,
      result
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

export async function testServicesAction() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      throw new Error('Not authenticated');
    }

    const processor = await createInvoiceProcessor();
    const results = await processor.testServices();

    return {
      success: true,
      results
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return {
      success: false,
      error: errorMessage
    };
  }
}
