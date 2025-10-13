import { create } from 'zustand';

interface Purchase {
  id: string;
  amount: string;
  merchant: string;
  date: string;
  category: string;
  invoice: boolean;
  user_id: string;
  created_at: string;
}

interface RefundOpportunity {
  id: string;
  amount: string;
  merchant: string;
  reason: string;
  user_id: string;
  created_at: string;
}

interface Warranty {
  id: string;
  product: string;
  expiry_date: string;
  status: string;
  user_id: string;
  created_at: string;
}

interface TempDataState {
  purchases: Purchase[];
  refunds: RefundOpportunity[];
  warranties: Warranty[];
  syncProgress: number;
  isSyncing: boolean;
  lastSyncTime: string | null;
  
  // Actions
  addPurchase: (purchase: Omit<Purchase, 'id' | 'created_at'>) => void;
  addRefund: (refund: Omit<RefundOpportunity, 'id' | 'created_at'>) => void;
  addWarranty: (warranty: Omit<Warranty, 'id' | 'created_at'>) => void;
  setSyncProgress: (progress: number) => void;
  setSyncing: (syncing: boolean) => void;
  setLastSyncTime: (time: string) => void;
  clearData: () => void;
}

export const useTempDataStore = create<TempDataState>((set, get) => ({
  purchases: [],
  refunds: [],
  warranties: [],
  syncProgress: 0,
  isSyncing: false,
  lastSyncTime: null,

  addPurchase: (purchase) => {
    const newPurchase: Purchase = {
      ...purchase,
      id: `temp_${Date.now()}_${Math.random()}`,
      created_at: new Date().toISOString()
    };
    set((state) => ({
      purchases: [newPurchase, ...state.purchases]
    }));
  },

  addRefund: (refund) => {
    const newRefund: RefundOpportunity = {
      ...refund,
      id: `temp_${Date.now()}_${Math.random()}`,
      created_at: new Date().toISOString()
    };
    set((state) => ({
      refunds: [newRefund, ...state.refunds]
    }));
  },

  addWarranty: (warranty) => {
    const newWarranty: Warranty = {
      ...warranty,
      id: `temp_${Date.now()}_${Math.random()}`,
      created_at: new Date().toISOString()
    };
    set((state) => ({
      warranties: [newWarranty, ...state.warranties]
    }));
  },

  setSyncProgress: (progress) => {
    set({ syncProgress: progress });
  },

  setSyncing: (syncing) => {
    set({ isSyncing: syncing });
  },

  setLastSyncTime: (time) => {
    set({ lastSyncTime: time });
  },

  clearData: () => {
    set({
      purchases: [],
      refunds: [],
      warranties: [],
      syncProgress: 0,
      isSyncing: false,
      lastSyncTime: null
    });
  }
})); 