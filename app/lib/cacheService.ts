// Cache service - works on both client and server

/**
 * Cache Service for persisting dashboard data across route changes
 * This service works alongside the Zustand store to ensure data persistence
 */

interface CacheData {
  documents: any[];
  purchases: any[];
  totalSpent: number;
  hasInitialData: boolean;
  lastSyncTime: string | null;
  timestamp: number;
}

const CACHE_KEY = 'smartafter-dashboard-cache';
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

export class CacheService {
  private static instance: CacheService;
  private cache: CacheData | null = null;
  private listeners: Set<() => void> = new Set();

  private constructor() {
    // No longer loading from localStorage - using Supabase for persistence
    if (typeof window !== 'undefined') {
      console.log('📦 CacheService initialized - using Supabase for persistence');
    }
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // Server-side safe method to get data
  static getServerData(): CacheData | null {
    if (typeof window === 'undefined') {
      // Server-side: return null or fetch from database
      return null;
    }
    return CacheService.getInstance().getData();
  }

  // No longer using localStorage - data is persisted in Supabase

  // No longer saving to localStorage - data is persisted in Supabase

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // Public methods
  setData(data: Partial<CacheData>): void {
    if (typeof window !== 'undefined') {
      console.log('📝 setData called with:', data);
    }
    
    // Ensure documents is always an array
    const documents = 
    Array.isArray(data.documents) ? data.documents : 
                     Array.isArray(this.cache?.documents) ? this.cache.documents : [];
    
    // Ensure purchases is always an array
    const purchases = Array.isArray(data.purchases) ? data.purchases : 
                     Array.isArray(this.cache?.purchases) ? this.cache.purchases : [];
    
    this.cache = {
      documents,
      purchases,
      totalSpent: data.totalSpent || this.cache?.totalSpent || 0,
      hasInitialData: data.hasInitialData || this.cache?.hasInitialData || false,
      lastSyncTime: data.lastSyncTime || this.cache?.lastSyncTime || null,
      timestamp: Date.now()
    };

    if (typeof window !== 'undefined') {
      console.log('📝 Cache updated:', { 
        documentsCount: this.cache.documents.length,
        purchasesCount: this.cache.purchases.length,
        totalSpent: this.cache.totalSpent,
        hasInitialData: this.cache.hasInitialData
      });
    }

    // No longer saving to localStorage - data is persisted in Supabase
    this.notifyListeners();
  }

  getData(): CacheData | null {
    return this.cache;
  }

  getDocuments(): any[] {
    const documents = this.cache?.documents;
    if (typeof window !== 'undefined') {
      console.log('📄 getDocuments() called, cache:', this.cache);
      console.log('📄 documents from cache:', documents);
      console.log('📄 type of documents:', typeof documents, Array.isArray(documents));
    }
    
    // Ensure we always return an array
    if (Array.isArray(documents)) {
      return documents;
    } else if (documents && typeof documents === 'object') {
      // If it's an object but not an array, try to convert it
      if (typeof window !== 'undefined') {
        console.log('⚠️ documents is not an array, attempting conversion');
      }
      return Object.values(documents);
    } else {
      if (typeof window !== 'undefined') {
        console.log('⚠️ documents is not an array, returning empty array');
      }
      return [];
    }
  }

  getPurchases(): any[] {
    return this.cache?.purchases || [];
  }

  getTotalSpent(): number {
    return this.cache?.totalSpent || 0;
  }

  hasData(): boolean {
    return !!(this.cache && this.cache.documents.length > 0);
  }

  clearCache(): void {
    this.cache = null;
    // No longer clearing localStorage - data is persisted in Supabase
    this.notifyListeners();
  }

  addListener(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Update specific data
  updateDocuments(documents: any[]): void {
    if (typeof window !== 'undefined') {
      console.log('📄 updateDocuments called with:', documents.length, 'documents');
      console.log('📄 Type of documents:', typeof documents, Array.isArray(documents));
    }
    
    // Ensure documents is an array
    const safeDocuments = Array.isArray(documents) ? documents : [];
    if (typeof window !== 'undefined') {
      console.log('📄 Safe documents count:', safeDocuments.length);
    }
    
    this.setData({ documents: safeDocuments });
  }

  updatePurchases(purchases: any[]): void {
    this.setData({ purchases });
  }

  updateTotalSpent(totalSpent: number): void {
    this.setData({ totalSpent });
  }

  // Merge new documents with existing ones
  addDocuments(newDocuments: any[]): void {
    if (typeof window !== 'undefined') {
      console.log('📥 CacheService.addDocuments called with:', newDocuments);
      console.log('📥 Type of newDocuments:', typeof newDocuments, Array.isArray(newDocuments));
      console.log('📥 Current cache state:', this.cache);
    }
    
    // Ensure newDocuments is always an array
    const safeNewDocuments = Array.isArray(newDocuments) ? newDocuments : [];
    if (typeof window !== 'undefined') {
      console.log('📥 Safe new documents count:', safeNewDocuments.length);
    }
    
    if (safeNewDocuments.length === 0) {
      if (typeof window !== 'undefined') {
        console.log('📥 No documents to add, returning early');
      }
      return;
    }
    
    const existingDocuments = this.getDocuments();
    if (typeof window !== 'undefined') {
      console.log('📥 Existing documents from getDocuments():', existingDocuments);
      console.log('📥 Type of existingDocuments:', typeof existingDocuments, Array.isArray(existingDocuments));
    }
    
    // Ensure existingDocuments is always an array
    const safeExistingDocuments = Array.isArray(existingDocuments) ? existingDocuments : [];
    if (typeof window !== 'undefined') {
      console.log('📥 Safe existing documents:', safeExistingDocuments.length);
    }
    
    const existingIds = new Set(safeExistingDocuments.map(doc => doc.id));
    const uniqueNewDocuments = safeNewDocuments.filter(doc => !existingIds.has(doc.id));
    
    if (typeof window !== 'undefined') {
      console.log('📥 Unique new documents to add:', uniqueNewDocuments.length);
    }
    
    if (uniqueNewDocuments.length > 0) {
      const updatedDocuments = [...uniqueNewDocuments, ...safeExistingDocuments];
      if (typeof window !== 'undefined') {
        console.log('📥 Updated documents count:', updatedDocuments.length);
      }
      
      this.updateDocuments(updatedDocuments);
      
      // Recalculate total spent from all documents
      const totalSpent = updatedDocuments.reduce((sum, doc) => {
        const amount = typeof doc.amount === 'string' ? 
          parseFloat(doc.amount.replace(/[₹,\s]/g, '')) || 0 : 
          (doc.amount || 0);
        return sum + amount;
      }, 0);
      
      this.updateTotalSpent(totalSpent);
      if (typeof window !== 'undefined') {
        console.log('📥 Cache updated successfully with total spent:', totalSpent);
      }
    } else {
      if (typeof window !== 'undefined') {
        console.log('📥 No new documents to add - all are duplicates');
      }
    }
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();
