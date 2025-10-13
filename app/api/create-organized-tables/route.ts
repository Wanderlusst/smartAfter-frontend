import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    console.log('🏗️ Creating organized database tables...');

    // Create invoices table
    const invoicesResult = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT,
          message_id TEXT,
          filename TEXT,
          vendor TEXT,
          amount DECIMAL(10,2),
          date DATE,
          document_type TEXT DEFAULT 'invoice',
          confidence DECIMAL(3,2),
          raw_text TEXT,
          email_subject TEXT,
          email_from TEXT,
          email_date TIMESTAMP WITH TIME ZONE,
          attachment_id TEXT,
          attachment_size INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    // Create warranties table
    const warrantiesResult = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS warranties (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT,
          message_id TEXT,
          filename TEXT,
          vendor TEXT,
          amount DECIMAL(10,2),
          date DATE,
          document_type TEXT DEFAULT 'warranty',
          confidence DECIMAL(3,2),
          raw_text TEXT,
          email_subject TEXT,
          email_from TEXT,
          email_date TIMESTAMP WITH TIME ZONE,
          attachment_id TEXT,
          attachment_size INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    // Create refunds table
    const refundsResult = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS refunds (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT,
          message_id TEXT,
          filename TEXT,
          vendor TEXT,
          amount DECIMAL(10,2),
          date DATE,
          document_type TEXT DEFAULT 'refund',
          confidence DECIMAL(3,2),
          raw_text TEXT,
          email_subject TEXT,
          email_from TEXT,
          email_date TIMESTAMP WITH TIME ZONE,
          attachment_id TEXT,
          attachment_size INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    // Create documents table
    const documentsResult = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT,
          message_id TEXT,
          filename TEXT,
          vendor TEXT,
          amount DECIMAL(10,2),
          date DATE,
          document_type TEXT DEFAULT 'document',
          confidence DECIMAL(3,2),
          raw_text TEXT,
          email_subject TEXT,
          email_from TEXT,
          email_date TIMESTAMP WITH TIME ZONE,
          attachment_id TEXT,
          attachment_size INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    console.log('✅ Tables created successfully');

    return NextResponse.json({
      success: true,
      message: 'Organized tables created successfully',
      tables: {
        invoices: invoicesResult.error ? 'failed' : 'created',
        warranties: warrantiesResult.error ? 'failed' : 'created',
        refunds: refundsResult.error ? 'failed' : 'created',
        documents: documentsResult.error ? 'failed' : 'created'
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('❌ Error creating organized tables:', error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
