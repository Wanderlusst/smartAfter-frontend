// COMMENTED OUT - Multi-card API disabled
// Focus is now on email parsing only
/*
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.CREDIT_CARD_BACKEND_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cardStatements } = body;

    if (!cardStatements || !Array.isArray(cardStatements)) {
      return NextResponse.json(
        { success: false, error: 'cardStatements array is required' },
        { status: 400 }
      );
    }

    console.log('🔄 Processing multiple credit cards:', {
      cardCount: cardStatements.length,
      cards: cardStatements.map(card => ({
        bank: card.userInfo?.bankName,
        hasPdf: !!card.pdfBuffer
      }))
    });

    // Call backend multi-card service
    const response = await fetch(`${BACKEND_URL}/api/process-multiple-cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cardStatements }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Backend error:', errorData);
      return NextResponse.json(
        { success: false, error: errorData.error || 'Backend processing failed' },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('✅ Multi-card processing successful:', {
      totalCards: result.data.totalCards,
      totalTransactions: result.data.combinedTransactions.length,
      processingTime: result.processingTime
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Multi-card processing error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get cards summary
    const response = await fetch(`${BACKEND_URL}/api/cards/summary`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch cards summary');
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Error fetching cards summary:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch cards summary' 
      },
      { status: 500 }
    );
  }
}
*/

// Placeholder API - Multi-card functionality disabled
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Multi-card analysis is temporarily disabled. Focus is on email parsing.' },
    { status: 503 }
  );
}
