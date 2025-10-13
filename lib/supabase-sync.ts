import { createServerClient } from '@/app/lib/supabaseClient';

export interface GmailPurchase {
  id: string;
  messageId: string;
  vendor: string;
  amount: string;
  date: string;
  subject: string;
  category?: string;
  isInvoice?: boolean;
}

export interface GmailRefund {
  id: string;
  item: string;
  reason: string;
  amount: string;
  daysLeft: number;
  status: string;
  date: string;
  vendor: string;
}

export interface GmailWarranty {
  id: string;
  item: string;
  coverage: string;
  expiryDate: string;
  daysLeft: number;
  status: string;
  type: string;
  vendor: string;
}

export interface GmailDocument {
  id: string;
  name: string;
  title: string;
  type: string;
  amount: string;
  date: string;
  vendor: string;
  category: string;
  size: string;
  mimeType: string;
  isPdf: boolean;
  isInvoice: boolean;
}

export interface GmailData {
  totalSpent: number;
  purchaseCount: number;
  activeWarranties: number;
  purchases: GmailPurchase[];
  refundOpportunities: GmailRefund[];
  warranties: GmailWarranty[];
  documents: {
    total: number;
    receipts: number;
    invoices: number;
  };
  refundable: {
    amount: number;
    percentage: number;
  };
  monthlySpending: number;
  categories: Record<string, number>;
  source: string;
  fetchedAt: string;
}

export class SupabaseSyncService {
  private supabase: any;

  constructor() {
    this.supabase = createServerClient();
  }

  // Store Gmail data in Supabase
  async storeGmailData(userId: string, gmailData: GmailData): Promise<boolean> {
    try {
      console.log('💾 Starting Supabase sync for Gmail data...');
      
      // Store purchases
      if (gmailData.purchases.length > 0) {
        await this.storePurchases(userId, gmailData.purchases);
      }

      // Store refund opportunities
      if (gmailData.refundOpportunities.length > 0) {
        await this.storeRefundOpportunities(userId, gmailData.refundOpportunities);
      }

      // Store warranties
      if (gmailData.warranties.length > 0) {
        await this.storeWarranties(userId, gmailData.warranties);
      }

      // Store documents
      if (gmailData.documents.total > 0) {
        await this.storeDocuments(userId, gmailData.documents);
      }

      // Store summary data
      await this.storeSummaryData(userId, gmailData);

      console.log('✅ Supabase sync completed successfully');
      return true;

    } catch (error) {
      console.error('❌ Supabase sync failed:', error);
      return false;
    }
  }

  // Store purchases in Supabase
  private async storePurchases(userId: string, purchases: GmailPurchase[]): Promise<void> {
    const purchaseData = purchases.map(purchase => ({
      user_id: userId,
      vendor: purchase.vendor,
      amount: purchase.amount,
      date: new Date(purchase.date).toISOString().split('T')[0],
      subject: purchase.subject,
      email_id: purchase.messageId,
      has_invoice: purchase.isInvoice || false,
      category: purchase.category || 'Other',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // First, delete existing purchases for this user to avoid duplicates
    await this.supabase
      .from('purchases')
      .delete()
      .eq('user_id', userId);

    // Then insert new purchases
    const { error } = await this.supabase
      .from('purchases')
      .insert(purchaseData);

    if (error) {
      console.error('❌ Error storing purchases:', error);
      throw error;
    }

    console.log(`📦 Stored ${purchases.length} purchases in Supabase`);
  }

  // Store refund opportunities in Supabase
  private async storeRefundOpportunities(userId: string, refunds: GmailRefund[]): Promise<void> {
    const refundData = refunds.map(refund => ({
      user_id: userId,
      item: refund.item,
      reason: refund.reason,
      amount: refund.amount,
      days_left: refund.daysLeft,
      status: refund.status,
      vendor: refund.vendor,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // First, delete existing refund opportunities for this user to avoid duplicates
    await this.supabase
      .from('refund_opportunities')
      .delete()
      .eq('user_id', userId);

    // Then insert new refund opportunities
    const { error } = await this.supabase
      .from('refund_opportunities')
      .insert(refundData);

    if (error) {
      console.error('❌ Error storing refund opportunities:', error);
      throw error;
    }

    console.log(`💰 Stored ${refunds.length} refund opportunities in Supabase`);
  }

  // Store warranties in Supabase
  private async storeWarranties(userId: string, warranties: GmailWarranty[]): Promise<void> {
    const warrantyData = warranties.map(warranty => ({
      user_id: userId,
      item: warranty.item,
      coverage: warranty.coverage,
      expiry_date: warranty.expiryDate.split('T')[0],
      days_left: warranty.daysLeft,
      status: warranty.status,
      type: warranty.type,
      vendor: warranty.vendor,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // First, delete existing warranties for this user to avoid duplicates
    await this.supabase
      .from('warranties')
      .delete()
      .eq('user_id', userId);

    // Then insert new warranties
    const { error } = await this.supabase
      .from('warranties')
      .insert(warrantyData);

    if (error) {
      console.error('❌ Error storing warranties:', error);
      throw error;
    }

    console.log(`🛡️ Stored ${warranties.length} warranties in Supabase`);
  }

  // Store documents in Supabase
  private async storeDocuments(userId: string, documents: any): Promise<void> {
    // For now, we'll store document summary
    // You can extend this to store individual documents if needed
    const documentData = {
      user_id: userId,
      total_documents: documents.total,
      receipts: documents.receipts,
      invoices: documents.invoices,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await this.supabase
      .from('document_summary')
      .upsert(documentData, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('❌ Error storing document summary:', error);
      // Don't throw error for document summary as it's not critical
    }

    console.log(`📄 Stored document summary in Supabase`);
  }

  // Store summary data in Supabase
  private async storeSummaryData(userId: string, gmailData: GmailData): Promise<void> {
    const summaryData = {
      user_id: userId,
      total_spent: gmailData.totalSpent,
      purchase_count: gmailData.purchaseCount,
      active_warranties: gmailData.activeWarranties,
      monthly_spending: gmailData.monthlySpending,
      refundable_amount: gmailData.refundable.amount,
      categories: JSON.stringify(gmailData.categories),
      source: gmailData.source,
      fetched_at: gmailData.fetchedAt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await this.supabase
      .from('user_summary')
      .upsert(summaryData, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('❌ Error storing summary data:', error);
      throw error;
    }

    console.log(`📊 Stored summary data in Supabase`);
  }

  // Fetch cached data from Supabase
  async getCachedData(userId: string, days: number = 7): Promise<GmailData | null> {
    try {
      console.log('📥 Fetching cached data from Supabase...');
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Fetch all data in parallel
      const [purchasesResult, refundsResult, warrantiesResult, summaryResult] = await Promise.allSettled([
        this.supabase
          .from('purchases')
          .select('*')
          .eq('user_id', userId)
          .gte('date', cutoffDate.toISOString().split('T')[0])
          .order('date', { ascending: false }),
        
        this.supabase
          .from('refund_opportunities')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        
        this.supabase
          .from('warranties')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        
        this.supabase
          .from('user_summary')
          .select('*')
          .eq('user_id', userId)
          .single()
      ]);

      const purchases = purchasesResult.status === 'fulfilled' ? purchasesResult.value.data || [] : [];
      const refunds = refundsResult.status === 'fulfilled' ? refundsResult.value.data || [] : [];
      const warranties = warrantiesResult.status === 'fulfilled' ? warrantiesResult.value.data || [] : [];
      const summary = summaryResult.status === 'fulfilled' ? summaryResult.value.data : null;

      // Check if we have recent data (within last 6 hours)
      if (summary && summary.fetched_at) {
        const lastFetch = new Date(summary.fetched_at);
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
        
        if (lastFetch > sixHoursAgo) {
          console.log('✅ Using cached data from Supabase (fresh)');
          
          return {
            totalSpent: summary.total_spent || 0,
            purchaseCount: summary.purchase_count || 0,
            activeWarranties: summary.active_warranties || 0,
            purchases: purchases.map(p => ({
              id: p.email_id || p.id,
              messageId: p.email_id || p.id,
              vendor: p.vendor,
              amount: p.amount,
              date: p.date,
              subject: p.subject,
              category: p.category,
              isInvoice: p.has_invoice
            })),
            refundOpportunities: refunds.map(r => ({
              id: r.id,
              item: r.item,
              reason: r.reason,
              amount: r.amount,
              daysLeft: r.days_left,
              status: r.status,
              date: r.created_at,
              vendor: r.vendor
            })),
            warranties: warranties.map(w => ({
              id: w.id,
              item: w.item,
              coverage: w.coverage,
              expiryDate: w.expiry_date,
              daysLeft: w.days_left,
              status: w.status,
              type: w.type,
              vendor: w.vendor
            })),
            documents: {
              total: summary.total_documents || 0,
              receipts: summary.receipts || 0,
              invoices: summary.invoices || 0
            },
            refundable: {
              amount: summary.refundable_amount || 0,
              percentage: summary.refundable_amount > 0 ? 15 : 0
            },
            monthlySpending: summary.monthly_spending || 0,
            categories: summary.categories ? JSON.parse(summary.categories) : {},
            source: 'supabase-cached',
            fetchedAt: summary.fetched_at
          };
        }
      }

      console.log('⚠️ Cached data is stale, will fetch fresh data');
      return null;

    } catch (error) {
      console.error('❌ Error fetching cached data:', error);
      return null;
    }
  }

  // Clear old data
  async clearOldData(userId: string, daysToKeep: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      await Promise.allSettled([
        this.supabase
          .from('purchases')
          .delete()
          .eq('user_id', userId)
          .lt('date', cutoffDate.toISOString().split('T')[0]),
        
        this.supabase
          .from('refund_opportunities')
          .delete()
          .eq('user_id', userId)
          .lt('created_at', cutoffDate.toISOString()),
        
        this.supabase
          .from('warranties')
          .delete()
          .eq('user_id', userId)
          .lt('created_at', cutoffDate.toISOString())
      ]);

      console.log(`🧹 Cleared data older than ${daysToKeep} days`);
    } catch (error) {
      console.error('❌ Error clearing old data:', error);
    }
  }
}

// Export singleton instance
export const supabaseSyncService = new SupabaseSyncService();
