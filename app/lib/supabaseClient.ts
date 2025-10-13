import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client (for API routes)
export const createServerClient = () => {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return client;
};

// Enhanced server client with NextAuth integration
export const createAuthenticatedServerClient = async () => {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    throw new Error('User not authenticated');
  }
  
  const client = createClient(supabaseUrl, supabaseAnonKey);
  
  // Set the auth context for RLS policies
  // In production, you might want to create a custom JWT or use service role key
  // For now, we'll use email as the user identifier
  return {
    client,
    userId: session.user.email, // Use email as user ID for now
    session
  };
};

// Database Types (update these based on your actual schema)
export interface Purchase {
  id: string;
  user_id?: string;
  vendor: string;
  amount: string;
  date: string;
  subject?: string;
  product_name?: string;
  store?: string;
  price?: string;
  purchase_date?: string;
  return_deadline?: string;
  warranty_status?: string;
  has_invoice?: boolean;
  email_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RefundOpportunity {
  id: string;
  user_id?: string;
  item: string;
  reason: string;
  amount: string;
  days_left: number;
  status: 'eligible' | 'urgent' | 'processing';
  created_at?: string;
}

export interface CompletedRefund {
  id: string;
  user_id?: string;
  item: string;
  amount: string;
  date: string;
  status: 'completed' | 'processing';
  created_at?: string;
}

export interface Warranty {
  id: string;
  user_id?: string;
  item: string;
  coverage: string;
  expiry_date: string;
  days_left: number;
  status: 'active' | 'expiring' | 'expired';
  type: string;
  created_at?: string;
}

export interface WarrantyClaim {
  id: string;
  user_id?: string;
  item: string;
  amount: string;
  date: string;
  status: 'approved' | 'processing' | 'rejected';
  created_at?: string;
} 