import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase, type Purchase, type RefundOpportunity, type CompletedRefund, type Warranty, type WarrantyClaim } from '@/app/lib/supabaseClient';
import { queueBackgroundOperation, trackBackgroundOperation, untrackBackgroundOperation } from '@/app/lib/navigation';

// Performance optimization: Debounce store updates
let updateTimeout: NodeJS.Timeout | null = null;
const debouncedUpdate = (updateFn: () => void, delay = 100) => {
  if (updateTimeout) clearTimeout(updateTimeout);
  updateTimeout = setTimeout(updateFn, delay);
};

interface DataState {
  // Data
  purchases: Purchase[];
  refundOpportunities: RefundOpportunity[];
  completedRefunds: CompletedRefund[];
  warranties: Warranty[];
  warrantyClaims: WarrantyClaim[];
  documents: Purchase[]; // Purchases with invoices
  
  // Loading states
  isLoading: boolean;
  isInitialLoading: boolean;
  isSyncing: boolean;
  isEmailSyncing: boolean;
  
  // Error states
  error: string | null;
  
  // Metadata
  lastSyncTime: string | null;
  totalSpent: number;
  emailSyncProgress: number;
  hasInitialData: boolean;
  
  // Authentication state
  isAuthenticated: boolean;
  
  // Debouncing state
  isFetching: boolean;
  
  // Actions
  fetchAllData: (userId?: string) => Promise<void>;
  fetchInitialData: (userId?: string, days?: number) => Promise<void>;
  syncEmailData: (userId?: string, months?: number) => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Individual fetch actions
  fetchPurchases: (userId?: string) => Promise<void>;
  fetchRefunds: (userId?: string) => Promise<void>;
  fetchWarranties: (userId?: string) => Promise<void>;
  fetchDocuments: (userId?: string) => Promise<void>;
  
  // CRUD operations
  addPurchase: (purchase: Omit<Purchase, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updatePurchase: (id: string, purchase: Partial<Purchase>) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
  
  addRefund: (refund: Omit<RefundOpportunity, 'id' | 'created_at'>) => Promise<void>;
  updateRefund: (id: string, refund: Partial<RefundOpportunity>) => Promise<void>;
  
  addWarranty: (warranty: Omit<Warranty, 'id' | 'created_at'>) => Promise<void>;
  updateWarranty: (id: string, warranty: Partial<Warranty>) => Promise<void>;
  
  // Utility actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearData: () => void;
  calculateTotalSpent: () => void;
  setAuthenticated: (authenticated: boolean) => void;
  setInitialData: (data: any) => void;
  initializeFromCache: () => void;
  
  // Optimistic update actions for sync
  addPurchaseOptimistically: (purchase: Omit<Purchase, 'id' | 'created_at' | 'updated_at'>) => void;
  addRefundOptimistically: (refund: Omit<RefundOpportunity, 'id' | 'created_at'>) => void;
  addWarrantyOptimistically: (warranty: Omit<Warranty, 'id' | 'created_at'>) => void;
  updateSyncProgress: (progress: number) => void;
  
  // Real-time document updates
  addDocumentRealtime: (document: any) => void;
  updateDocumentsRealtime: (documents: any[]) => void;
  addBackgroundDocuments: (documents: any[]) => void;
}

export const useDataStore = create<DataState>()(
  devtools(
    (set, get) => ({
      // Initial state - Try to load from cache service first, then start fresh
      purchases: [],
      refundOpportunities: [],
      completedRefunds: [],
      warranties: [],
      warrantyClaims: [],
      documents: [],
      
      isLoading: false,
      isInitialLoading: false,
      isSyncing: false,
      isEmailSyncing: false,
      isFetching: false,
      
      error: null,
      
      lastSyncTime: null,
      totalSpent: 0, // Start with 0, will be updated from cache if available
      emailSyncProgress: 0,
      hasInitialData: false, // Will be updated from cache if available
      isAuthenticated: false,
      
      // Fetch all data from Supabase - SIMPLIFIED VERSION
      fetchAllData: async (userId?: string) => {
        const { isAuthenticated, isFetching } = get();
        if (!isAuthenticated) {
          return;
        }
        
        if (isFetching) {
          return;
        }
        
        set({ isLoading: true, isFetching: true, error: null });
        
        // Track background operation
        const operationId = `data-fetch-${Date.now()}`;
        trackBackgroundOperation(operationId);
        
        try {
          // Use provided userId or fallback to email from session
          let currentUserId = userId;
          
          if (!currentUserId) {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              currentUserId = user?.id || user?.email;
            } catch (authError) {
              // If Supabase auth fails, we can't fetch data
              set({ isLoading: false, isFetching: false, error: 'Authentication failed' });
              untrackBackgroundOperation(operationId);
              return;
            }
          }
          
          if (!currentUserId) {
            set({ isLoading: false, isFetching: false, error: null });
            untrackBackgroundOperation(operationId);
            return;
          }
          
          // PERFORMANCE FIX: Use cached data first, then fetch in background
          // Check if we have recent cached data (less than 5 minutes old)
          const cachedData = cacheService.getData();
          if (cachedData && cachedData.documents.length > 0) {
            console.log('📄 Using cached data for instant loading');
            set({
              purchases: cachedData.purchases || [],
              refundOpportunities: [],
              warranties: [],
              documents: cachedData.documents || [],
              totalSpent: cachedData.totalSpent || 0,
              hasInitialData: true,
              isLoading: false,
              error: null,
              lastSyncTime: cachedData.lastSyncTime || new Date().toISOString()
            });
          }
          
          // Queue the data fetch operation to prevent navigation blocking
          queueBackgroundOperation(async () => {
            try {
              // PERFORMANCE FIX: Only fetch if we don't have recent data
              const shouldFetch = !cachedData || !cachedData.documents.length;
              
              if (!shouldFetch) {
                console.log('📄 Skipping API fetch - using cached data');
                return;
              }
              
              // Fetch real data from APIs with caching
              const [purchasesResponse, refundsResponse, warrantiesResponse, documentsResponse] = await Promise.all([
                fetch('/api/purchases/fast'),
                fetch('/api/refunds/fast'),
                fetch('/api/warranties/fast'),
                fetch('/api/documents/fast')
              ]);

              const purchasesData = await purchasesResponse.json();
              const refundsData = await refundsResponse.json();
              const warrantiesData = await warrantiesResponse.json();
              const documentsData = await documentsResponse.json();

              // Update store with fresh data only
              set({
                purchases: purchasesData.purchases || [],
                refundOpportunities: refundsData.refundOpportunities || [],
                warranties: warrantiesData.warranties || [],
                documents: documentsData.documents || [],
                totalSpent: purchasesData.totalSpent || 0,
                hasInitialData: true,
                isLoading: false,
                error: null,
                lastSyncTime: new Date().toISOString()
              });

            } catch (error) {
              
              set({
                error: 'Failed to load data',
                isLoading: false
              });
            } finally {
              untrackBackgroundOperation(operationId);
            }
          });
          
        } catch (error) {
          
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch data',
            isLoading: false,
            isFetching: false
          });
          untrackBackgroundOperation(operationId);
        }
      },
      
      // Fetch initial data (with Gmail sync for recent emails) - SIMPLIFIED
      fetchInitialData: async (userId?: string, days = 30) => {
        const { isAuthenticated, isFetching } = get();
        if (!isAuthenticated) {
          return;
        }
        
        if (isFetching) {
          return;
        }
        
        set({ isInitialLoading: true, isFetching: true, error: null });
        
        try {
          // Use provided userId or fallback to email from session
          let currentUserId = userId;
          
          if (!currentUserId) {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              currentUserId = user?.id || user?.email;
            } catch (authError) {
              
              set({ isInitialLoading: false, isFetching: false, error: 'Authentication failed' });
              return;
            }
          }
          
          if (!currentUserId) {
            
            set({ isInitialLoading: false, isFetching: false, error: null });
            return;
          }
          
          // Fetch fresh initial data from Supabase
          await get().fetchAllData(currentUserId);
          
          set({ isInitialLoading: false, isFetching: false });
          
        } catch (error) {
          
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch initial data',
            isInitialLoading: false,
            isFetching: false
          });
        }
      },
      
      // Sync email data in background - SIMPLIFIED
      syncEmailData: async (userId?: string, months = 3) => {
        const { isAuthenticated, isEmailSyncing } = get();
        if (!isAuthenticated) {
          return;
        }
        
        if (isEmailSyncing) {
          return;
        }
        
        // Check if sync was already completed for this session
        if (sessionStorage.getItem('background-sync-completed')) {
          return;
        }

        // Check if sync is already running in another tab/window
        if (sessionStorage.getItem('background-sync-started')) {
          return;
        }

        // Mark sync as started
        sessionStorage.setItem('background-sync-started', 'true');
        
        set({ isEmailSyncing: true, emailSyncProgress: 0, error: null });
        
        // Track background operation
        const operationId = `email-sync-${Date.now()}`;
        trackBackgroundOperation(operationId);
        
        try {
          // Use provided userId or fallback to email from session
          let currentUserId = userId;
          
          if (!currentUserId) {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              currentUserId = user?.id || user?.email;
            } catch (authError) {
              
              set({ isEmailSyncing: false, emailSyncProgress: 0, error: 'Authentication failed' });
              untrackBackgroundOperation(operationId);
              return;
            }
          }
          
          if (!currentUserId) {
            
            set({ isEmailSyncing: false, emailSyncProgress: 0, error: null });
            untrackBackgroundOperation(operationId);
            return;
          }

          // Queue the sync operation to prevent navigation blocking
          queueBackgroundOperation(async () => {
            try {
              
              // Call Gmail sync API with longer timeout for real data processing
              const controller = new AbortController();
              const timeoutId = setTimeout(() => {
                controller.abort();
              }, 180000); // 3 minute timeout (increased for real data processing)
              
              try {
                const response = await fetch('/api/gmail-sync', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ months, userId: currentUserId }),
                  signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                  const errorText = await response.text();
                  
                  throw new Error(`Email sync failed: ${response.status} - ${errorText}`);
                }
                
                const result = await response.json();
                
                // Mark that background sync is completed for this session
                sessionStorage.setItem('background-sync-completed', 'true');
                sessionStorage.removeItem('background-sync-started');
                
                // Reset sync state
                set({ isEmailSyncing: false, emailSyncProgress: 100 });
                
                // CRITICAL: Update data store directly with Gmail sync result instead of calling refreshData
                if (result && result.data) {
                  
                  // Extract data from the sync result
                  const syncData = result.data;
                  const purchases = syncData.purchases || [];
                  const refundOpportunities = syncData.refundOpportunities || [];
                  const warranties = syncData.warranties || [];
                  const documents = syncData.documents || [];
                  const totalSpent = syncData.totalSpent || 0;
                  
                  // Update the data store directly
                  debouncedUpdate(() => {
                    set({
                      purchases,
                      refundOpportunities,
                      warranties,
                      documents,
                      totalSpent,
                      hasInitialData: true,
                      lastSyncTime: new Date().toISOString(),
                      isEmailSyncing: false,
                      emailSyncProgress: 100
                    });

                  }, 50); // Small delay to batch updates
                } else if (result && result.inserted) {
                  // Fallback: If no data field, but we have insertion counts, fetch the data
                  
                  // Fetch fresh data after sync
                  if (!get().isEmailSyncing) {
                    await get().refreshData();
                  }
                } else {
                  // Fallback to refreshData if no data in result
                  if (!get().isEmailSyncing) {
                    await get().refreshData();
                  }
                }
              } catch (error) {
                
                const errorMessage = error instanceof Error ? error.message : 'Email sync failed';
                
                // Clean up sync state on error
                sessionStorage.removeItem('background-sync-started');
                set({ isEmailSyncing: false, emailSyncProgress: 0, error: errorMessage });
                
                // Handle different types of errors
                if (errorMessage.includes('Failed to fetch') || errorMessage.includes('aborted')) {
                  
                  // Don't show error to user for background sync failures
                } else if (errorMessage.includes('timeout')) {
                  
                  // Don't show timeout errors to user
                } else {
                  
                  set({ error: errorMessage });
                }
                
                set({ 
                  isEmailSyncing: false,
                  emailSyncProgress: 0 
                });
              } finally {
                untrackBackgroundOperation(operationId);
              }
            } catch (error) {
              
              set({ 
                isEmailSyncing: false,
                emailSyncProgress: 0 
              });
              untrackBackgroundOperation(operationId);
            }
          });
          
        } catch (error) {
          
          set({ 
            error: (error as Error).message, 
            isEmailSyncing: false,
            emailSyncProgress: 0 
          });
          untrackBackgroundOperation(operationId);
        }
      },
      
      // Refresh data - SIMPLIFIED
      refreshData: async () => {
        const { isAuthenticated, isFetching } = get();
        if (!isAuthenticated) {
          return;
        }
        
        if (isFetching) {
          return;
        }
        
        // Clear existing data before fetching fresh data
        set({ 
          purchases: [], 
          refundOpportunities: [], 
          warranties: [], 
          documents: [], 
          totalSpent: 0,
          hasInitialData: false 
        });
        
        await get().fetchAllData();
      },
      
      // Individual fetch methods - SIMPLIFIED
      fetchPurchases: async (userId?: string) => {
        const { isAuthenticated } = get();
        if (!isAuthenticated) {
          return;
        }
        
        try {
          // Use provided userId or fallback to email from session
          let currentUserId = userId;
          
          if (!currentUserId) {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              currentUserId = user?.id || user?.email;
            } catch (authError) {
              
              return;
            }
          }
          
          if (!currentUserId) {
            
            return;
          }
          
          const { data, error } = await supabase
            .from('purchases')
            .select('*')
            .eq('user_id', currentUserId)
            .order('date', { ascending: false });
          
          if (error) throw error;
          
          set({ purchases: data || [] });
        } catch (error) {
          
          set({ error: error instanceof Error ? error.message : 'Failed to fetch purchases' });
        }
      },
      
      fetchRefunds: async (userId?: string) => {
        const { isAuthenticated } = get();
        if (!isAuthenticated) {
          return;
        }
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const currentUserId = userId || user?.id;
          
          if (!currentUserId) return;
          
          const { data, error } = await supabase
            .from('refund_opportunities')
            .select('*')
            .eq('user_id', currentUserId)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          
          set({ refundOpportunities: data || [] });
        } catch (error) {
          
          set({ error: error instanceof Error ? error.message : 'Failed to fetch refunds' });
        }
      },
      
      fetchWarranties: async (userId?: string) => {
        const { isAuthenticated } = get();
        if (!isAuthenticated) {
          return;
        }
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const currentUserId = userId || user?.id;
          
          if (!currentUserId) return;
          
          const { data, error } = await supabase
            .from('warranties')
            .select('*')
            .eq('user_id', currentUserId)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          
          set({ warranties: data || [] });
        } catch (error) {
          
          set({ error: error instanceof Error ? error.message : 'Failed to fetch warranties' });
        }
      },

      // Fetch documents from Gmail API
      fetchDocuments: async (userId?: string) => {
        const { isAuthenticated } = get();
        if (!isAuthenticated) {
          return;
        }
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const currentUserId = userId || user?.id;
          
          if (!currentUserId) return;

          // Fetch documents from Gmail API
          const response = await fetch('/api/documents');
          
          if (!response.ok) {
            const errorText = await response.text();
            
            throw new Error(`Documents fetch failed: ${response.status} - ${errorText}`);
          }
          
          const result = await response.json();
          
          // Transform documents to match the expected interface
          const transformedDocuments = (result.documents || [])
            .filter((doc: any) => {
              // Include all documents, even with zero amounts initially
              // The backend will update amounts later through background processing
              const isPdfOrInvoice = doc.isPdf || doc.isInvoice || doc.type === 'invoice' || doc.type === 'pdf';
              
              return isPdfOrInvoice;
            })
            .map((doc: any) => ({
              id: doc.id,
              vendor: doc.vendor || 'Unknown Vendor',
              amount: doc.amount || '₹0',
              date: doc.date || new Date().toISOString(),
              subject: doc.title || doc.emailSubject || 'Document',
              isInvoice: doc.isInvoice || doc.type === 'invoice',
              messageId: doc.messageId
            }));
          
          // Update store with documents
          set({ documents: transformedDocuments });
          
        } catch (error) {
          
          set({ error: error instanceof Error ? error.message : 'Failed to fetch documents' });
        }
      },
      
      // CRUD operations
      addPurchase: async (purchase) => {
        const { isAuthenticated } = get();
        if (!isAuthenticated) {
          return;
        }
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const currentUserId = user?.id;
          
          if (!currentUserId) return;
          
          const { data, error } = await supabase
            .from('purchases')
            .insert([{ ...purchase, user_id: currentUserId }])
            .select();
          
          if (error) throw error;
          
          set(state => ({
            purchases: [data[0], ...state.purchases]
          }));
        } catch (error) {
          
          set({ error: error instanceof Error ? error.message : 'Failed to add purchase' });
        }
      },
      
      updatePurchase: async (id, purchase) => {
        const { isAuthenticated } = get();
        if (!isAuthenticated) {
          return;
        }
        
        try {
          const { data, error } = await supabase
            .from('purchases')
            .update(purchase)
            .eq('id', id)
            .select();
          
          if (error) throw error;
          
          set(state => ({
            purchases: state.purchases.map(p => p.id === id ? data[0] : p)
          }));
        } catch (error) {
          
          set({ error: error instanceof Error ? error.message : 'Failed to update purchase' });
        }
      },
      
      deletePurchase: async (id) => {
        const { isAuthenticated } = get();
        if (!isAuthenticated) {
          return;
        }
        
        try {
          const { error } = await supabase
            .from('purchases')
            .delete()
            .eq('id', id);
          
          if (error) throw error;
          
          set(state => ({
            purchases: state.purchases.filter(p => p.id !== id)
          }));
        } catch (error) {
          
          set({ error: error instanceof Error ? error.message : 'Failed to delete purchase' });
        }
      },
      
      addRefund: async (refund) => {
        const { isAuthenticated } = get();
        if (!isAuthenticated) {
          return;
        }
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const currentUserId = user?.id;
          
          if (!currentUserId) return;
          
          const { data, error } = await supabase
            .from('refund_opportunities')
            .insert([{ ...refund, user_id: currentUserId }])
            .select();
          
          if (error) throw error;
          
          set(state => ({
            refundOpportunities: [data[0], ...state.refundOpportunities]
          }));
        } catch (error) {
          
          set({ error: error instanceof Error ? error.message : 'Failed to add refund' });
        }
      },
      
      updateRefund: async (id, refund) => {
        const { isAuthenticated } = get();
        if (!isAuthenticated) {
          return;
        }
        
        try {
          const { data, error } = await supabase
            .from('refund_opportunities')
            .update(refund)
            .eq('id', id)
            .select();
          
          if (error) throw error;
          
          set(state => ({
            refundOpportunities: state.refundOpportunities.map(r => r.id === id ? data[0] : r)
          }));
        } catch (error) {
          
          set({ error: error instanceof Error ? error.message : 'Failed to update refund' });
        }
      },
      
      addWarranty: async (warranty) => {
        const { isAuthenticated } = get();
        if (!isAuthenticated) {
          return;
        }
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const currentUserId = user?.id;
          
          if (!currentUserId) return;
          
          const { data, error } = await supabase
            .from('warranties')
            .insert([{ ...warranty, user_id: currentUserId }])
            .select();
          
          if (error) throw error;
          
          set(state => ({
            warranties: [data[0], ...state.warranties]
          }));
        } catch (error) {
          
          set({ error: error instanceof Error ? error.message : 'Failed to add warranty' });
        }
      },
      
      updateWarranty: async (id, warranty) => {
        const { isAuthenticated } = get();
        if (!isAuthenticated) {
          return;
        }
        
        try {
          const { data, error } = await supabase
            .from('warranties')
            .update(warranty)
            .eq('id', id)
            .select();
          
          if (error) throw error;
          
          set(state => ({
            warranties: state.warranties.map(w => w.id === id ? data[0] : w)
          }));
        } catch (error) {
          
          set({ error: error instanceof Error ? error.message : 'Failed to update warranty' });
        }
      },
      
      // Utility actions
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearData: () => set({
        purchases: [],
        refundOpportunities: [],
        completedRefunds: [],
        warranties: [],
        warrantyClaims: [],
        documents: [],
        totalSpent: 0,
        hasInitialData: false,
        isAuthenticated: false,
        error: null
      }),
      calculateTotalSpent: () => {
        const { purchases, documents } = get();
        
        // Calculate from purchases array (if available)
        const purchasesTotal = purchases.reduce((sum, purchase) => {
          const amount = parseFloat(purchase.price || purchase.amount || '0');
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);
        
        // Calculate from documents array (primary source)
        const documentsTotal = Array.isArray(documents) ? documents.reduce((sum, doc) => {
          const amount = typeof doc.amount === 'string' ? 
            parseFloat(doc.amount.replace(/[₹,\s]/g, '')) || 0 : 
            (doc.amount || 0);
          return sum + amount;
        }, 0) : 0;
        
        // Use the higher of the two totals (documents should be primary)
        const totalSpent = Math.max(purchasesTotal, documentsTotal);
        
        
        set({ totalSpent });
      },
      setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
      setInitialData: (data) => {
        const newState = {
          purchases: data.purchases || [],
          refundOpportunities: data.refundOpportunities || [],
          completedRefunds: data.completedRefunds || [],
          warranties: data.warranties || [],
          warrantyClaims: data.warrantyClaims || [],
          documents: data.documentsArray || (Array.isArray(data.documents) ? data.documents : []), // Handle both old and new structure
          totalSpent: data.totalSpent || 0,
          lastSyncTime: data.lastSyncTime || null,
          hasInitialData: data.hasInitialData || false,
          isAuthenticated: data.isAuthenticated || false,
        };

        set(newState);
      },

      initializeFromCache: () => {
        // Import cache service dynamically to avoid circular dependencies
        if (typeof window !== 'undefined') {
          import('../lib/cacheService').then(({ cacheService }) => {
            const cacheData = cacheService.getData();
            if (cacheData && cacheData.documents.length > 0) {
              console.log('🔄 INITIALIZING STORE FROM CACHE:', {
                documentsCount: cacheData.documents.length,
                totalSpent: cacheData.totalSpent,
                hasInitialData: cacheData.hasInitialData
              });
              
              set({
                documents: cacheData.documents,
                purchases: cacheData.purchases || cacheData.documents,
                totalSpent: cacheData.totalSpent,
                hasInitialData: cacheData.hasInitialData,
                lastSyncTime: cacheData.lastSyncTime
              });
            }
          });
        }
      },
      
      // Optimistic update actions for sync
      addPurchaseOptimistically: (purchase) => {
        const tempId = `temp-${Date.now()}-${Math.random()}`;
        const optimisticPurchase = {
          ...purchase,
          id: tempId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        set(state => ({
          purchases: [optimisticPurchase, ...state.purchases],
          totalSpent: state.totalSpent + parseFloat(purchase.price || '0')
        }));
      },
      
      addRefundOptimistically: (refund) => {
        const tempId = `temp-${Date.now()}-${Math.random()}`;
        const optimisticRefund = {
          ...refund,
          id: tempId,
          created_at: new Date().toISOString(),
        };
        
        set(state => ({
          refundOpportunities: [optimisticRefund, ...state.refundOpportunities]
        }));
      },
      
      addWarrantyOptimistically: (warranty) => {
        const tempId = `temp-${Date.now()}-${Math.random()}`;
        const optimisticWarranty = {
          ...warranty,
          id: tempId,
          created_at: new Date().toISOString(),
        };
        
        set(state => ({
          warranties: [optimisticWarranty, ...state.warranties]
        }));
      },
      
      updateSyncProgress: (progress) => set({ emailSyncProgress: progress }),
      
      // Real-time document updates
      addDocumentRealtime: (document) => {

        // Transform the document to match our Document interface
        const transformedDocument = {
          id: document.id || `doc_${document.messageId}`,
          vendor: document.vendor || document.parsedInvoice?.vendor || 'Unknown Vendor',
          amount: typeof document.amount === 'string' ? document.amount : `₹${document.parsedInvoice?.total || document.amount || 0}`,
          date: document.date || new Date().toISOString(),
          subject: document.subject || document.title || 'Document',
          isInvoice: document.isInvoice !== undefined ? document.isInvoice : true,
          messageId: document.messageId,
          geminiAnalysis: document.geminiAnalysis || {
            confidence: document.confidence || 0.5,
            source: document.source || 'email',
            parsedData: document.parsedInvoice || {},
            attachmentCount: document.attachmentCount || 0,
            pdfAttachments: document.pdfAttachments || []
          }
        };
        
        // Include all documents initially, even with zero amounts
        // Background processing will update amounts later
        const shouldInclude = true;
        
        if (shouldInclude) {
          set(state => {
            // Check if document already exists
            const existingIndex = state.documents.findIndex(doc => 
              (doc as any).messageId === transformedDocument.messageId || doc.id === transformedDocument.id
            );
            
            if (existingIndex >= 0) {
              // Update existing document
              const newDocuments = [...state.documents];
              newDocuments[existingIndex] = transformedDocument;
              return { documents: newDocuments };
            } else {
              // Add new document at the beginning
              return { documents: [transformedDocument, ...state.documents] };
            }
          });

        } else {
          
        }
      },
      
      updateDocumentsRealtime: (documents) => {

        // Transform all documents to match our Document interface
        const transformedDocuments = documents
          .map(document => ({
            id: document.id || `doc_${document.messageId}`,
            vendor: document.vendor || document.parsedInvoice?.vendor || 'Unknown Vendor',
            amount: typeof document.amount === 'string' ? document.amount : `₹${document.parsedInvoice?.total || document.amount || 0}`,
            date: document.date || new Date().toISOString(),
            subject: document.subject || document.title || 'Document',
            isInvoice: document.isInvoice !== undefined ? document.isInvoice : true,
            messageId: document.messageId,
            geminiAnalysis: document.geminiAnalysis || {
              confidence: document.confidence || 0.5,
              source: document.source || 'email',
              parsedData: document.parsedInvoice || {},
              attachmentCount: document.attachmentCount || 0,
              pdfAttachments: document.pdfAttachments || []
            }
          }))
          .filter(doc => {
            // Include all documents initially, even with zero amounts
            // Background processing will update amounts later
            return true;
          });
        
        set({ documents: transformedDocuments });

      },

      addBackgroundDocuments: (documents) => {
        console.log('📥 Adding background documents to store:', documents.length);
        console.log('📥 First document sample:', documents[0]);
        
        set(state => {
          // Ensure documents is always an array
          const currentDocuments = Array.isArray(state.documents) ? state.documents : [];
          console.log('📥 Current documents in store:', currentDocuments.length);
          
          // Merge with existing documents, avoiding duplicates
          const existingIds = new Set(currentDocuments.map(doc => doc.id));
          const newDocuments = documents.filter(doc => !existingIds.has(doc.id));
          
          if (newDocuments.length === 0) {
            console.log('⏸️ No new documents to add - all are duplicates');
            return state; // No changes needed
          }
          
          console.log(`✅ Adding ${newDocuments.length} new documents (${documents.length - newDocuments.length} duplicates skipped)`);
          
          const updatedDocuments = [...newDocuments, ...currentDocuments];
          console.log('📥 Updated documents count:', updatedDocuments.length);
          
          // Recalculate total spent from all documents
          const newTotalSpent = updatedDocuments.reduce((sum, doc) => {
            const amount = typeof doc.amount === 'string' ? 
              parseFloat(doc.amount.replace(/[₹,\s]/g, '')) || 0 : 
              (doc.amount || 0);
            return sum + amount;
          }, 0);
          
          console.log('💰 Recalculated total spent from documents:', newTotalSpent);
          
          return {
            documents: updatedDocuments,
            totalSpent: newTotalSpent,
            hasInitialData: true,
            lastSyncTime: new Date().toISOString()
          };
        });
        
        console.log('🔄 Background documents added and store updated');
        console.log('🔄 Final store state:', {
          documentsCount: get().documents.length,
          totalSpent: get().totalSpent,
          hasInitialData: get().hasInitialData
        });
      },
    })
  )
); 