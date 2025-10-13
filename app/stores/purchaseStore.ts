
interface Purchase {
  id: string;
  productName: string;
  store: string;
  price: string;
  purchaseDate: string;
  returnDeadline: string;
  warrantyStatus: string;
  hasInvoice: boolean;
  extractedData?: {
    totalAmount?: string;
    vendor?: string;
    date?: string;
    items?: string[];
    rawText: string;
  };
}

class PurchaseStore {
  private purchases: Purchase[] = [];
  private listeners: ((purchases: Purchase[]) => void)[] = [];
  private isClient = typeof window !== 'undefined';
  private isLoading = false;

  constructor() {
    // Only load purchases on client side
    if (this.isClient) {
      this.loadPurchases();
    }
  }

  private async loadPurchases() {
    if (!this.isClient || this.isLoading) return;
    
    this.isLoading = true;
    
    try {

      // Fetch real data from Gmail API
      const response = await fetch('/api/gmail-invoice-analysis?maxResults=50');
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data.invoices) {
          // Transform Gmail invoice data to purchase format
          this.purchases = data.data.invoices.map((invoice: any) => ({
            id: `gmail-${invoice.messageId}`,
            productName: invoice.subject,
            store: invoice.vendor,
            price: `₹${invoice.amount}`,
            purchaseDate: invoice.date,
            returnDeadline: this.calculateReturnDeadline(invoice.date),
            warrantyStatus: 'Active',
            hasInvoice: true,
            extractedData: {
              totalAmount: `₹${invoice.amount}`,
              vendor: invoice.vendor,
              date: invoice.date,
              items: [invoice.subject],
              rawText: invoice.subject,
              messageId: invoice.messageId,
              from: invoice.from
            }
          }));

        } else {
          
          this.purchases = [];
        }
      } else {
        
        this.purchases = [];
      }
    } catch (error) {
      
      this.purchases = [];
    }
    
    this.isLoading = false;
    this.notifyListeners();
  }

  private loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('smartafter_purchases');
      if (saved) {
        this.purchases = JSON.parse(saved);
        
      }
    } catch (error) {
      
      this.purchases = [];
    }
  }

  private calculateReturnDeadline(purchaseDate: string): string {
    if (!purchaseDate) return new Date().toISOString().split('T')[0];
    
    const date = new Date(purchaseDate);
    date.setDate(date.getDate() + 30); // 30 days return window
    return date.toISOString().split('T')[0];
  }

  private savePurchases() {
    if (!this.isClient) return;
    
    try {
      localStorage.setItem('smartafter_purchases', JSON.stringify(this.purchases));
      
    } catch (error) {
      
    }
  }

  async refreshPurchases() {
    if (!this.isClient) return;
    
    this.isLoading = true;
    this.notifyListeners();
    
    // BACKGROUND PROCESSING COMPLETELY DISABLED - No API calls

    // No sample data - keep existing purchases
    
    this.isLoading = false;
    this.notifyListeners();
  }

  addPurchase(purchase: Omit<Purchase, 'id'>) {
    const newPurchase: Purchase = {
      ...purchase,
      id: Date.now().toString(),
    };
    this.purchases.push(newPurchase);
    this.savePurchases(); // Save to localStorage
    this.notifyListeners();

  }

  getPurchases(): Purchase[] {
    return [...this.purchases];
  }

  getIsLoading(): boolean {
    return this.isLoading;
  }

  subscribe(listener: (purchases: Purchase[]) => void) {
    this.listeners.push(listener);
    // Immediately call with current data
    listener(this.getPurchases());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.getPurchases()));
  }

  // Add method to clear all purchases (for testing)
  clearAllPurchases() {
    this.purchases = [];
    this.savePurchases();
    this.notifyListeners();
    
  }
}

export const purchaseStore = new PurchaseStore();
export type { Purchase };
