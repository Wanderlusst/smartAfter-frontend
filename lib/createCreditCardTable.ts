import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function createCreditCardTableIfNotExists(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔧 Creating credit_card_settings table if it doesn\'t exist...');
    
    // SQL to create the table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS credit_card_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        date_of_birth DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id)
      );
    `;

    const createIndexSQL = `
      CREATE INDEX IF NOT EXISTS idx_credit_card_settings_user_id ON credit_card_settings(user_id);
    `;

    const disableRLSSQL = `
      ALTER TABLE credit_card_settings DISABLE ROW LEVEL SECURITY;
    `;

    const createTriggerFunctionSQL = `
      CREATE OR REPLACE FUNCTION update_credit_card_settings_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;

    const createTriggerSQL = `
      DROP TRIGGER IF EXISTS update_credit_card_settings_updated_at ON credit_card_settings;
      CREATE TRIGGER update_credit_card_settings_updated_at
        BEFORE UPDATE ON credit_card_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_credit_card_settings_updated_at();
    `;

    // Execute the SQL statements
    const { error: tableError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    if (tableError) {
      console.error('❌ Error creating table:', tableError);
      return { success: false, error: `Failed to create table: ${tableError.message}` };
    }

    const { error: indexError } = await supabase.rpc('exec_sql', { sql: createIndexSQL });
    if (indexError) {
      console.warn('⚠️ Warning creating index:', indexError);
    }

    const { error: rlsError } = await supabase.rpc('exec_sql', { sql: disableRLSSQL });
    if (rlsError) {
      console.warn('⚠️ Warning disabling RLS:', rlsError);
    }

    const { error: functionError } = await supabase.rpc('exec_sql', { sql: createTriggerFunctionSQL });
    if (functionError) {
      console.warn('⚠️ Warning creating trigger function:', functionError);
    }

    const { error: triggerError } = await supabase.rpc('exec_sql', { sql: createTriggerSQL });
    if (triggerError) {
      console.warn('⚠️ Warning creating trigger:', triggerError);
    }

    console.log('✅ Credit card settings table created successfully');
    return { success: true };
  } catch (error) {
    console.error('💥 Error creating table:', error);
    return { success: false, error: 'Failed to create table' };
  }
}
