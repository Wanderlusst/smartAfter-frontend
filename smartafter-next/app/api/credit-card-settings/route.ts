// COMMENTED OUT - Credit Card Settings API disabled
// Focus is now on email parsing only
/*
import { NextRequest, NextResponse } from 'next/server';
import { CreditCardSettingsServerService } from '@/lib/creditCardSettingsServerService';

// GET - Load credit card settings
export async function GET() {
  try {
    const result = await CreditCardSettingsServerService.loadSettings();
    
    if (result.success) {
      return NextResponse.json(result.data);
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to load settings' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error loading credit card settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Save credit card settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📝 Received request body:', body);
    
    const { firstName, lastName, dateOfBirth } = body;

    // Validate required fields
    if (!firstName || !lastName || !dateOfBirth) {
      console.log('❌ Missing required fields:', { firstName, lastName, dateOfBirth });
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, dateOfBirth' },
        { status: 400 }
      );
    }

    console.log('✅ All required fields present, calling server service...');
    const result = await CreditCardSettingsServerService.saveSettings({
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dateOfBirth
    });

    console.log('📊 Server service result:', result);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Settings saved successfully'
      });
    } else {
      console.log('❌ Server service failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to save settings' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('💥 Error saving credit card settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete credit card settings
export async function DELETE() {
  try {
    const result = await CreditCardSettingsServerService.deleteSettings();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Settings deleted successfully'
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to delete settings' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error deleting credit card settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
*/

import { NextRequest, NextResponse } from 'next/server';

// Placeholder APIs - Credit Card Settings disabled
export async function GET() {
  return NextResponse.json(
    { error: 'Credit card settings are temporarily disabled. Focus is on email parsing.' },
    { status: 503 }
  );
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Credit card settings are temporarily disabled. Focus is on email parsing.' },
    { status: 503 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Credit card settings are temporarily disabled. Focus is on email parsing.' },
    { status: 503 }
  );
}
