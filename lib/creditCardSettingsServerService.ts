import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export interface CreditCardSettings {
  id?: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  date_of_birth: string; // YYYY-MM-DD format
  created_at?: string;
  updated_at?: string;
}

export class CreditCardSettingsServerService {
  /**
   * Save credit card settings to Supabase (server-side)
   */
  static async saveSettings(settings: Omit<CreditCardSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔐 Getting server session...');
      // Get current user from NextAuth session
      const session = await getServerSession(authOptions);
      console.log('👤 Session:', session ? 'Found' : 'Not found');
      
      if (!session?.user?.email) {
        console.log('❌ No user email in session');
        return { success: false, error: 'User not authenticated' };
      }

      // Use email as user_id
      const userId = session.user.email;
      console.log('📧 User ID:', userId);
      console.log('💾 Settings to save:', settings);

      // First, let's check if the table exists by trying to select from it
      console.log('🔍 Checking if table exists...');
      const { data: testData, error: testError } = await supabase
        .from('credit_card_settings')
        .select('id')
        .limit(1);

      if (testError) {
        console.error('❌ Table check error:', testError);
        console.error('❌ Table check error details:', JSON.stringify(testError, null, 2));
        
        if (testError.code === 'PGRST116' || 
            testError.message?.includes('relation "credit_card_settings" does not exist') ||
            testError.message?.includes('does not exist')) {
          return { 
            success: false, 
            error: 'Credit card settings table does not exist. Please run the SQL schema in your Supabase dashboard first. Check the credit-card-settings-schema.sql file.' 
          };
        }
        return { success: false, error: `Table check failed: ${testError.message || JSON.stringify(testError)}` };
      }

      console.log('✅ Table exists, proceeding with upsert...');
      
      // Upsert settings (insert or update)
      console.log('🗄️ Calling Supabase upsert...');
      const { error } = await supabase
        .from('credit_card_settings')
        .upsert({
          user_id: userId,
          first_name: settings.first_name,
          last_name: settings.last_name,
          date_of_birth: settings.date_of_birth,
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('❌ Supabase error:', error);
        console.error('❌ Supabase error details:', JSON.stringify(error, null, 2));
        return { success: false, error: error.message || JSON.stringify(error) };
      }

      console.log('✅ Settings saved successfully');
      return { success: true };
    } catch (error) {
      console.error('💥 Error in saveSettings:', error);
      return { success: false, error: 'Failed to save settings' };
    }
  }

  /**
   * Load credit card settings from Supabase (server-side)
   */
  static async loadSettings(): Promise<{ success: boolean; data?: CreditCardSettings; error?: string }> {
    try {
      console.log('🔍 Loading credit card settings...');
      
      // Get current user from NextAuth session
      const session = await getServerSession(authOptions);
      console.log('👤 Session in loadSettings:', session ? 'Found' : 'Not found');
      
      if (!session?.user?.email) {
        console.log('❌ No user email in session for loadSettings');
        return { success: false, error: 'User not authenticated' };
      }

      // Use email as user_id
      const userId = session.user.email;
      console.log('📧 User ID for loadSettings:', userId);

      // Fetch settings
      console.log('🗄️ Fetching settings from Supabase...');
      const { data, error } = await supabase
        .from('credit_card_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      console.log('📊 Supabase response:', { data, error });

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found
          console.log('⚠️ No settings found for user');
          return { success: true, data: undefined };
        }
        console.error('❌ Error loading credit card settings:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Settings loaded successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('💥 Error in loadSettings:', error);
      return { success: false, error: 'Failed to load settings' };
    }
  }

  /**
   * Delete credit card settings (server-side)
   */
  static async deleteSettings(): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current user from NextAuth session
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return { success: false, error: 'User not authenticated' };
      }

      // Use email as user_id
      const userId = session.user.email;

      // Delete settings
      const { error } = await supabase
        .from('credit_card_settings')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting credit card settings:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in deleteSettings:', error);
      return { success: false, error: 'Failed to delete settings' };
    }
  }
}
