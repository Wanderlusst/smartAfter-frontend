import { NextRequest, NextResponse } from 'next/server';
import { createDatabaseService } from '@/lib/dbService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Create database service
    const dbService = await createDatabaseService(session.user.email);

    // Get invoice statistics
    const stats = await dbService.getInvoiceStats();
    
    // Get warranty alerts
    const warrantyAlerts = await dbService.getWarrantyAlerts();

    return NextResponse.json({
      success: true,
      stats,
      warrantyAlerts
    });

  } catch (error: any) {

    return NextResponse.json(
      { 
        error: 'Failed to fetch invoice stats',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
