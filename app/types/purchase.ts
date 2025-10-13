// Unified data model for all purchase-related data from Gmail API
export interface PurchaseRecord {
  id: string;
  vendor: string;
  amount: number;
  date: string;
  category: 'purchase' | 'refund' | 'warranty' | 'receipt';
  source: 'gmail';
  rawEmailId: string;
  subject?: string;
  extractedData?: {
    receiptUrl?: string;
    warrantyExpiry?: string;
    refundEligible?: boolean;
    refundDeadline?: string;
    warrantyTerms?: string;
    merchantDetails?: {
      name: string;
      email?: string;
      phone?: string;
      address?: string;
    };
    itemDetails?: {
      name: string;
      quantity?: number;
      unitPrice?: number;
      totalPrice: number;
    }[];
  };
}

// Dashboard metrics interface
export interface DashboardMetrics {
  totalSpent: number;
  avgMonthly: number;
  growthPercentage: number;
  activeWarranties: number;
  expiringWarranties: number;
  documents: {
    total: number;
    receipts: number;
    invoices: number;
    warranties: number;
    needsOrganization: number;
  };
  refundable: {
    amount: number;
    percentage: number;
  };
  chartData: {
    labels: string[];
    data: number[];
  };
  insights: {
    avgMonthlySpend: number;
    topCategory: { name: string; percentage: number; amount: number };
    mostActiveDay: { day: string; percentage: number; amount: number };
    topMerchant: { name: string; percentage: number; amount: number };
  };
  fetchedAt: string;
  error?: string; // Optional error field for error handling
}

// API response interfaces
export interface PurchasesResponse {
  purchases: PurchaseRecord[];
  totalSpent: number;
  monthlySpending: Array<{ month: string; amount: number }>;
  categories: Array<{ name: string; amount: number }>;
  fetchedAt: string;
  loading: boolean;
  cached: boolean;
  streaming: boolean;
  cacheTimestamp: string;
}

export interface RefundsResponse {
  refundOpportunities: Array<{
    id: string;
    purchaseId: string;
    vendor: string;
    amount: number;
    purchaseDate: string;
    refundDeadline: string;
    reason: string;
    status: 'eligible' | 'expired' | 'claimed';
  }>;
  completedRefunds: Array<{
    id: string;
    purchaseId: string;
    vendor: string;
    amount: number;
    refundDate: string;
    status: 'completed' | 'pending' | 'rejected';
  }>;
}

export interface WarrantiesResponse {
  activeWarranties: Array<{
    id: string;
    purchaseId: string;
    vendor: string;
    item: string;
    amount: number;
    purchaseDate: string;
    warrantyExpiry: string;
    status: 'active' | 'expired' | 'expiring_soon';
  }>;
  expiringWarranties: number;
  totalWarranties: number;
}

// Chart data interfaces
export interface ChartData {
  labels: string[];
  data: number[];
  backgroundColor?: string[];
  borderColor?: string[];
}

// Category mapping
export type PurchaseCategory = 
  | 'Shopping'
  | 'Transportation'
  | 'Entertainment'
  | 'Food & Dining'
  | 'Finance'
  | 'Telecom'
  | 'Utilities'
  | 'Travel'
  | 'Healthcare'
  | 'Electronics'
  | 'Other';

// Utility functions for data processing - BULLETPROOF
export const parseAmount = (amount: string | number): number => {
  try {
    // Handle numbers
    if (typeof amount === 'number') {
      return isNaN(amount) ? 0 : amount;
    }
    
    // Handle null/undefined
    if (!amount || amount === 'N/A') return 0;
    
    // Handle non-strings
    if (typeof amount !== 'string') {
      // Try to convert to string and process
      try {
        const stringAmount = String(amount);
        // Manual string cleaning without replace method
        let cleanString = '';
        for (let i = 0; i < stringAmount.length; i++) {
          const char = stringAmount[i];
          if (char >= '0' && char <= '9' || char === '.' || char === '-') {
            cleanString += char;
          }
        }
        const parsed = parseFloat(cleanString);
        return isNaN(parsed) ? 0 : parsed;
      } catch (error) {
        
        return 0;
      }
    }
    
    // Handle strings - manual cleaning without replace method
    let cleanString = '';
    for (let i = 0; i < amount.length; i++) {
      const char = amount[i];
      if (char >= '0' && char <= '9' || char === '.' || char === '-') {
        cleanString += char;
      }
    }
    const parsed = parseFloat(cleanString);
    return isNaN(parsed) ? 0 : parsed;
  } catch (error) {
    
    return 0;
  }
};

export const formatAmount = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

export const getCategoryFromVendor = (vendor: string): PurchaseCategory => {
  const lowerVendor = vendor.toLowerCase();
  
  // Shopping
  if (lowerVendor.includes('amazon') || lowerVendor.includes('flipkart') || lowerVendor.includes('myntra') || 
      lowerVendor.includes('ajio') || lowerVendor.includes('nykaa') || lowerVendor.includes('croma') ||
      lowerVendor.includes('reliance') || lowerVendor.includes('bigbasket') || lowerVendor.includes('grofers')) {
    return 'Shopping';
  } 
  // Transportation
  else if (lowerVendor.includes('uber') || lowerVendor.includes('ola') || lowerVendor.includes('rapido') ||
           lowerVendor.includes('metro') || lowerVendor.includes('bus') || lowerVendor.includes('train') ||
           lowerVendor.includes('petrol') || lowerVendor.includes('fuel')) {
    return 'Transportation';
  } 
  // Entertainment
  else if (lowerVendor.includes('netflix') || lowerVendor.includes('hotstar') || lowerVendor.includes('prime') ||
           lowerVendor.includes('spotify') || lowerVendor.includes('youtube') || lowerVendor.includes('music') ||
           lowerVendor.includes('disney') || lowerVendor.includes('sony') || lowerVendor.includes('zee')) {
    return 'Entertainment';
  } 
  // Food & Dining
  else if (lowerVendor.includes('swiggy') || lowerVendor.includes('zomato') || lowerVendor.includes('dominos') ||
           lowerVendor.includes('pizza') || lowerVendor.includes('burger') || lowerVendor.includes('kfc') ||
           lowerVendor.includes('mcdonalds') || lowerVendor.includes('starbucks') || lowerVendor.includes('cafe')) {
    return 'Food & Dining';
  } 
  // Finance
  else if (lowerVendor.includes('paytm') || lowerVendor.includes('phonepe') || lowerVendor.includes('gpay') ||
           lowerVendor.includes('bank') || lowerVendor.includes('credit') || lowerVendor.includes('loan') ||
           lowerVendor.includes('insurance') || lowerVendor.includes('mutual') || lowerVendor.includes('investment')) {
    return 'Finance';
  } 
  // Telecom
  else if (lowerVendor.includes('jio') || lowerVendor.includes('airtel') || lowerVendor.includes('vodafone') ||
           lowerVendor.includes('idea') || lowerVendor.includes('bsnl') || lowerVendor.includes('mtnl')) {
    return 'Telecom';
  } 
  // Utilities
  else if (lowerVendor.includes('electricity') || lowerVendor.includes('gas') || lowerVendor.includes('water') ||
           lowerVendor.includes('power') || lowerVendor.includes('bills') || lowerVendor.includes('utility')) {
    return 'Utilities';
  } 
  // Travel
  else if (lowerVendor.includes('book') || lowerVendor.includes('makemytrip') || lowerVendor.includes('irctc') ||
           lowerVendor.includes('goibibo') || lowerVendor.includes('yatra') || lowerVendor.includes('cleartrip') ||
           lowerVendor.includes('hotel') || lowerVendor.includes('flight') || lowerVendor.includes('travel')) {
    return 'Travel';
  } 
  // Healthcare
  else if (lowerVendor.includes('hospital') || lowerVendor.includes('medical') || lowerVendor.includes('pharmacy') ||
           lowerVendor.includes('apollo') || lowerVendor.includes('fortis') || lowerVendor.includes('max') ||
           lowerVendor.includes('doctor') || lowerVendor.includes('clinic') || lowerVendor.includes('health')) {
    return 'Healthcare';
  } 
  // Electronics
  else if (lowerVendor.includes('electronic') || lowerVendor.includes('mobile') || lowerVendor.includes('laptop') ||
           lowerVendor.includes('apple') || lowerVendor.includes('samsung') || lowerVendor.includes('xiaomi') ||
           lowerVendor.includes('oneplus') || lowerVendor.includes('dell') || lowerVendor.includes('hp')) {
    return 'Electronics';
  }
  
  return 'Other';
}; 