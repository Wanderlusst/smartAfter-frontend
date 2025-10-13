'use client';

/**
 * Database Sync Service
 * Handles synchronization of extracted data with the database
 * Ensures data consistency across all pages and sessions
 */

import { cacheService } from './cacheService';
import { dataSyncService } from './dataSyncService';

interface DocumentData {
  id: string;
  messageId: string;
  vendor: string;
  amount: string | number;
  date: string;
  subject: string;
  emailFrom: string;
  emailSubject: string;
  emailDate: string;
  attachmentId?: string;
  attachmentFilename?: string;
  attachmentMimeType?: string;
  isInvoice: boolean;
  isPdf?: boolean;
  confidence?: number;
  source: string;
  geminiAnalysis?: any;
  createdAt?: string;
  updatedAt?: string;
}

interface SyncResult {
  success: boolean;
  documents: DocumentData[];
  totalSpent: number;
  message: string;
  source: 'database' | 'cache' | 'api';
}

class DatabaseSyncService {
  private static instance: DatabaseSyncService;
  private isSyncing = false;
  private lastSyncTime: number = 0;
  private syncInterval: number = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    // Start periodic sync
    if (typeof window !== 'undefined') {
      setInterval(() => this.syncWithDatabase(), this.syncInterval);
    }
  }

  static getInstance(): DatabaseSyncService {
    if (!DatabaseSyncService.instance) {
      DatabaseSyncService.instance = new DatabaseSyncService();
    }
    return DatabaseSyncService.instance;
  }

  // Save documents to database
  async saveDocumentsToDatabase(documents: DocumentData[]): Promise<SyncResult> {
    console.log('💾 DatabaseSyncService: saveDocumentsToDatabase called with:', {
      documents,
      type: typeof documents,
      isArray: Array.isArray(documents),
      length: documents?.length || 0,
      constructor: documents?.constructor?.name
    });

    // Validate documents parameter
    if (!Array.isArray(documents)) {
      console.error('❌ DatabaseSyncService: documents parameter is not an array:', {
        documents,
        type: typeof documents,
        constructor: documents?.constructor?.name
      });
      
      // Try to convert to array if it's an object
      if (typeof documents === 'object' && documents !== null) {
        console.log('🔄 DatabaseSyncService: Attempting to convert object to array');
        const documentsArray = Object.values(documents);
        if (Array.isArray(documentsArray)) {
          console.log('✅ DatabaseSyncService: Successfully converted to array:', documentsArray.length);
          return this.saveDocumentsToDatabase(documentsArray);
        }
      }
      
      return {
        success: false,
        documents: [],
        totalSpent: 0,
        message: 'Invalid documents parameter - must be an array',
        source: 'cache'
      };
    }

    if (documents.length === 0) {
      console.log('⚠️ DatabaseSyncService: Empty documents array, skipping save');
      return {
        success: true,
        documents: [],
        totalSpent: 0,
        message: 'No documents to save',
        source: 'cache'
      };
    }

    if (this.isSyncing) {
      console.log('⏸️ Database sync already in progress, skipping');
      return {
        success: false,
        documents: [],
        totalSpent: 0,
        message: 'Sync already in progress',
        source: 'cache'
      };
    }

    this.isSyncing = true;
    console.log('💾 DatabaseSyncService: Saving documents to database:', documents.length);

    // TEMPORARY: Use cache-only mode to avoid database errors
    console.log('🔄 DatabaseSyncService: Using cache-only mode temporarily');
    cacheService.setData({
      documents,
      purchases: documents,
      totalSpent: this.calculateTotalSpent(documents),
      hasInitialData: true,
      lastSyncTime: new Date().toISOString()
    });

    dataSyncService.updateDocuments(documents, 'cache-only-mode');

    this.isSyncing = false;
    return {
      success: true,
      documents,
      totalSpent: this.calculateTotalSpent(documents),
      message: 'Documents saved to cache (database sync temporarily disabled)',
      source: 'cache'
    };

    /* DISABLED FOR NOW - UNCOMMENT WHEN DATABASE IS READY
    try {
      console.log('💾 DatabaseSyncService: Sending documents to API:', {
        count: documents.length,
        firstDocument: documents[0],
        sampleData: documents.slice(0, 2)
      });

      const response = await fetch('/api/sync-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documents,
          syncType: 'save',
          timestamp: Date.now()
        }),
      });

      console.log('💾 DatabaseSyncService: API response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('💾 DatabaseSyncService: API error response:', errorText);
        throw new Error(`Database sync failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ DatabaseSyncService: Documents saved successfully');
        
        // Update cache with the saved data
        cacheService.setData({
          documents: result.documents || documents,
          purchases: result.documents || documents,
          totalSpent: result.totalSpent || this.calculateTotalSpent(documents),
          hasInitialData: true,
          lastSyncTime: new Date().toISOString()
        });

        // Notify all pages
        dataSyncService.updateDocuments(result.documents || documents, 'database-sync');

        this.lastSyncTime = Date.now();
        
        return {
          success: true,
          documents: result.documents || documents,
          totalSpent: result.totalSpent || this.calculateTotalSpent(documents),
          message: 'Documents saved successfully',
          source: 'database'
        };
      } else {
        throw new Error(result.message || 'Database sync failed');
      }
    } catch (error) {
      console.error('❌ DatabaseSyncService: Error saving documents:', error);
      
      // Fallback to cache only
      console.log('🔄 DatabaseSyncService: Falling back to cache service');
      cacheService.setData({
        documents,
        purchases: documents,
        totalSpent: this.calculateTotalSpent(documents),
        hasInitialData: true,
        lastSyncTime: new Date().toISOString()
      });

      // Still notify other pages with cache data
      dataSyncService.updateDocuments(documents, 'database-sync-fallback');

      return {
        success: true, // Mark as success since we have data in cache
        documents,
        totalSpent: this.calculateTotalSpent(documents),
        message: `Database sync failed: ${error.message}. Using cache only.`,
        source: 'cache'
      };
    } finally {
      this.isSyncing = false;
    }
    */
  }

  // Load documents from database
  async loadDocumentsFromDatabase(): Promise<SyncResult> {
    console.log('📥 DatabaseSyncService: Loading documents from database');

    // TEMPORARY: Use cache-only mode
    console.log('🔄 DatabaseSyncService: Using cache-only mode for loading');
    const cacheData = cacheService.getData();
    if (cacheData && cacheData.documents.length > 0) {
      return {
        success: true,
        documents: cacheData.documents,
        totalSpent: cacheData.totalSpent,
        message: 'Documents loaded from cache (database sync temporarily disabled)',
        source: 'cache'
      };
    } else {
      return {
        success: true,
        documents: [],
        totalSpent: 0,
        message: 'No documents found in cache',
        source: 'cache'
      };
    }

    /* DISABLED FOR NOW - UNCOMMENT WHEN DATABASE IS READY
    try {
      const response = await fetch('/api/sync-documents', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Database load failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.documents && result.documents.length > 0) {
        console.log('✅ DatabaseSyncService: Documents loaded successfully:', result.documents.length);
        
        // Update cache with the loaded data
        cacheService.setData({
          documents: result.documents,
          purchases: result.documents,
          totalSpent: result.totalSpent || this.calculateTotalSpent(result.documents),
          hasInitialData: true,
          lastSyncTime: new Date().toISOString()
        });

        // Notify all pages
        dataSyncService.updateDocuments(result.documents, 'database-load');

        return {
          success: true,
          documents: result.documents,
          totalSpent: result.totalSpent || this.calculateTotalSpent(result.documents),
          message: 'Documents loaded successfully',
          source: 'database'
        };
      } else {
        console.log('📥 DatabaseSyncService: No documents found in database');
        return {
          success: true,
          documents: [],
          totalSpent: 0,
          message: 'No documents found',
          source: 'database'
        };
      }
    } catch (error) {
      console.error('❌ DatabaseSyncService: Error loading documents:', error);
      
      // Fallback to cache
      console.log('🔄 DatabaseSyncService: Falling back to cache for loading');
      const cacheData = cacheService.getData();
      return {
        success: true, // Mark as success since we have cache data
        documents: cacheData?.documents || [],
        totalSpent: cacheData?.totalSpent || 0,
        message: `Database load failed: ${error.message}. Using cache.`,
        source: 'cache'
      };
    }
    */
  }

  // Sync with database (load from DB, merge with cache)
  async syncWithDatabase(): Promise<SyncResult> {
    console.log('🔄 DatabaseSyncService: Syncing with database');

    try {
      // First, try to load from database
      const dbResult = await this.loadDocumentsFromDatabase();
      
      if (dbResult.success && dbResult.documents.length > 0) {
        console.log('✅ DatabaseSyncService: Sync completed with database data');
        return dbResult;
      } else {
        // If no database data, use cache
        const cacheData = cacheService.getData();
        if (cacheData && cacheData.documents.length > 0) {
          console.log('📥 DatabaseSyncService: Using cache data for sync');
          return {
            success: true,
            documents: cacheData.documents,
            totalSpent: cacheData.totalSpent,
            message: 'Using cache data',
            source: 'cache'
          };
        } else {
          console.log('📥 DatabaseSyncService: No data available for sync');
          return {
            success: true,
            documents: [],
            totalSpent: 0,
            message: 'No data available',
            source: 'cache'
          };
        }
      }
    } catch (error) {
      console.error('❌ DatabaseSyncService: Sync failed:', error);
      return {
        success: false,
        documents: [],
        totalSpent: 0,
        message: `Sync failed: ${error.message}`,
        source: 'cache'
      };
    }
  }

  // Force sync all data
  async forceSyncAll(): Promise<SyncResult> {
    console.log('🔄 DatabaseSyncService: Force syncing all data');
    
    // Clear cache first
    cacheService.clearCache();
    
    // Load from database
    return await this.loadDocumentsFromDatabase();
  }

  // Calculate total spent from documents
  private calculateTotalSpent(documents: DocumentData[]): number {
    // Ensure documents is an array
    if (!Array.isArray(documents)) {
      console.warn('calculateTotalSpent: documents is not an array:', documents);
      return 0;
    }
    
    return documents.reduce((sum, doc) => {
      const amount = typeof doc.amount === 'string' ? 
        parseFloat(doc.amount.replace(/[₹,\s]/g, '')) || 0 : 
        (doc.amount || 0);
      return sum + amount;
    }, 0);
  }

  // Get sync status
  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      timeSinceLastSync: Date.now() - this.lastSyncTime,
      cacheData: cacheService.getData()
    };
  }
}

// Export singleton instance
export const databaseSyncService = DatabaseSyncService.getInstance();
