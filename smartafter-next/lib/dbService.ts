import { createServerClient } from '@/app/lib/supabaseClient';
import { ParsedInvoice } from './pdfParser';

export interface StoredInvoice {
  id: string;
  user_id: string;
  gmail_message_id: string;
  merchant_name: string;
  invoice_number: string | null;
  purchase_date: string;
  total_amount: number;
  currency: string;
  warranty_period: number | null;
  warranty_end_date: string | null;
  category: string;
  status: 'processed' | 'failed' | 'pending';
  raw_pdf_data: Buffer | null;
  parsed_data: any;
  source_email_id: string | null;
  source_email_subject: string | null;
  source_email_from: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceStats {
  totalInvoices: number;
  totalAmount: number;
  averageAmount: number;
  categories: { [key: string]: number };
  monthlySpending: { [key: string]: number };
  activeWarranties: number;
  expiringWarranties: number;
}

export interface WarrantyAlert {
  id: string;
  merchant_name: string;
  purchase_date: string;
  warranty_end_date: string;
  days_remaining: number;
  total_amount: number;
  category: string;
}

export class DatabaseService {
  private supabase: any;
  private userId: string;

  constructor(userId: string) {
    this.supabase = createServerClient();
    this.userId = userId;
  }

  static async create(userId: string): Promise<DatabaseService> {
    return new DatabaseService(userId);
  }

  /**
   * Store parsed invoice in database
   */
  async storeInvoice(
    gmailMessageId: string,
    parsedInvoice: ParsedInvoice,
    rawPdfData?: Buffer,
    emailContext?: { subject: string; from: string; messageId: string }
  ): Promise<StoredInvoice> {
    try {

      const invoiceData = {
        user_id: this.userId,
        gmail_message_id: gmailMessageId,
        merchant_name: parsedInvoice.merchantName,
        invoice_number: parsedInvoice.invoiceNumber || null,
        purchase_date: parsedInvoice.purchaseDate,
        total_amount: parsedInvoice.totalAmount,
        currency: parsedInvoice.currency,
        warranty_period: parsedInvoice.warrantyPeriod || null,
        warranty_end_date: parsedInvoice.warrantyEndDate || null,
        category: parsedInvoice.category,
        status: 'processed' as const,
        raw_pdf_data: rawPdfData || null,
        parsed_data: parsedInvoice,
        source_email_id: emailContext?.messageId || null,
        source_email_subject: emailContext?.subject || null,
        source_email_from: emailContext?.from || null,
      };

      const { data, error } = await this.supabase
        .from('invoices')
        .upsert(invoiceData, {
          onConflict: 'gmail_message_id'
        })
        .select()
        .single();

      if (error) {
        
        throw new Error(`Failed to store invoice: ${error.message}`);
      }

      return data;

    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Store failed parsing attempt
   */
  async storeFailedInvoice(
    gmailMessageId: string,
    error: string,
    rawPdfData?: Buffer,
    emailContext?: { subject: string; from: string; messageId: string }
  ): Promise<StoredInvoice> {
    try {

      const invoiceData = {
        user_id: this.userId,
        gmail_message_id: gmailMessageId,
        merchant_name: 'Failed to Parse',
        invoice_number: null,
        purchase_date: new Date().toISOString().split('T')[0],
        total_amount: 0,
        currency: 'INR',
        warranty_period: null,
        warranty_end_date: null,
        category: 'Unknown',
        status: 'failed' as const,
        raw_pdf_data: rawPdfData || null,
        parsed_data: { error, timestamp: new Date().toISOString() },
        source_email_id: emailContext?.messageId || null,
        source_email_subject: emailContext?.subject || null,
        source_email_from: emailContext?.from || null,
      };

      const { data, dbError } = await this.supabase
        .from('invoices')
        .upsert(invoiceData, {
          onConflict: 'gmail_message_id'
        })
        .select()
        .single();

      if (dbError) {
        
        throw new Error(`Failed to store failed invoice: ${dbError.message}`);
      }

      return data;

    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Check if invoice already exists
   */
  async invoiceExists(gmailMessageId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('invoices')
        .select('id')
        .eq('gmail_message_id', gmailMessageId)
        .eq('user_id', this.userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        
        return false;
      }

      return !!data;
    } catch (error) {
      
      return false;
    }
  }

  /**
   * Get all invoices for user
   */
  async getInvoices(limit: number = 50, offset: number = 0): Promise<StoredInvoice[]> {
    try {
      const { data, error } = await this.supabase
        .from('invoices')
        .select('*')
        .eq('user_id', this.userId)
        .order('purchase_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        
        throw new Error(`Failed to fetch invoices: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStats(): Promise<InvoiceStats> {
    try {
      const { data, error } = await this.supabase
        .from('invoices')
        .select('total_amount, category, purchase_date, warranty_end_date')
        .eq('user_id', this.userId)
        .eq('status', 'processed');

      if (error) {
        
        throw new Error(`Failed to fetch invoice stats: ${error.message}`);
      }

      const invoices = data || [];
      
      // Calculate statistics
      const totalInvoices = invoices.length;
      const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const averageAmount = totalInvoices > 0 ? totalAmount / totalInvoices : 0;

      // Category breakdown
      const categories: { [key: string]: number } = {};
      invoices.forEach(inv => {
        const category = inv.category || 'Other';
        categories[category] = (categories[category] || 0) + 1;
      });

      // Monthly spending
      const monthlySpending: { [key: string]: number } = {};
      invoices.forEach(inv => {
        if (inv.purchase_date) {
          const month = inv.purchase_date.substring(0, 7); // YYYY-MM
          monthlySpending[month] = (monthlySpending[month] || 0) + (inv.total_amount || 0);
        }
      });

      // Warranty statistics
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const activeWarranties = invoices.filter(inv => 
        inv.warranty_end_date && new Date(inv.warranty_end_date) > now
      ).length;

      const expiringWarranties = invoices.filter(inv => 
        inv.warranty_end_date && 
        new Date(inv.warranty_end_date) > now && 
        new Date(inv.warranty_end_date) <= thirtyDaysFromNow
      ).length;

      return {
        totalInvoices,
        totalAmount,
        averageAmount,
        categories,
        monthlySpending,
        activeWarranties,
        expiringWarranties
      };

    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Get warranty alerts
   */
  async getWarrantyAlerts(): Promise<WarrantyAlert[]> {
    try {
      const { data, error } = await this.supabase
        .from('invoices')
        .select('id, merchant_name, purchase_date, warranty_end_date, total_amount, category')
        .eq('user_id', this.userId)
        .eq('status', 'processed')
        .not('warranty_end_date', 'is', null)
        .gte('warranty_end_date', new Date().toISOString().split('T')[0]) // Future dates only
        .order('warranty_end_date', { ascending: true });

      if (error) {
        
        throw new Error(`Failed to fetch warranty alerts: ${error.message}`);
      }

      const now = new Date();
      const alerts: WarrantyAlert[] = (data || []).map(inv => {
        const warrantyEndDate = new Date(inv.warranty_end_date);
        const daysRemaining = Math.ceil((warrantyEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: inv.id,
          merchant_name: inv.merchant_name,
          purchase_date: inv.purchase_date,
          warranty_end_date: inv.warranty_end_date,
          days_remaining: daysRemaining,
          total_amount: inv.total_amount,
          category: inv.category
        };
      });

      return alerts;

    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Get invoices by category
   */
  async getInvoicesByCategory(category: string, limit: number = 20): Promise<StoredInvoice[]> {
    try {
      const { data, error } = await this.supabase
        .from('invoices')
        .select('*')
        .eq('user_id', this.userId)
        .eq('category', category)
        .eq('status', 'processed')
        .order('purchase_date', { ascending: false })
        .limit(limit);

      if (error) {
        
        throw new Error(`Failed to fetch invoices by category: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Get recent invoices
   */
  async getRecentInvoices(days: number = 30, limit: number = 20): Promise<StoredInvoice[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const { data, error } = await this.supabase
        .from('invoices')
        .select('*')
        .eq('user_id', this.userId)
        .eq('status', 'processed')
        .gte('purchase_date', startDateStr)
        .order('purchase_date', { ascending: false })
        .limit(limit);

      if (error) {
        
        throw new Error(`Failed to fetch recent invoices: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Delete invoice
   */
  async deleteInvoice(invoiceId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)
        .eq('user_id', this.userId);

      if (error) {
        
        throw new Error(`Failed to delete invoice: ${error.message}`);
      }

      return true;
    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(invoiceId: string, status: 'processed' | 'failed' | 'pending'): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('invoices')
        .update({ status })
        .eq('id', invoiceId)
        .eq('user_id', this.userId);

      if (error) {
        
        throw new Error(`Failed to update invoice status: ${error.message}`);
      }

      return true;
    } catch (error: any) {
      
      throw error;
    }
  }
}

/**
 * Factory function to create database service instance
 */
export async function createDatabaseService(userId: string): Promise<DatabaseService> {
  return DatabaseService.create(userId);
}
