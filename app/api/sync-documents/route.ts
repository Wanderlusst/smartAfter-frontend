import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

// Mock database - in production, this would connect to your actual database
let documentsDatabase: any[] = [];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    console.log('📥 API: Loading documents from database for user:', session.user?.email);
    
    // Calculate total spent
    const totalSpent = documentsDatabase.reduce((sum, doc) => {
      const amount = typeof doc.amount === 'string' ? 
        parseFloat(doc.amount.replace(/[₹,\s]/g, '')) || 0 : 
        (doc.amount || 0);
      return sum + amount;
    }, 0);

    return NextResponse.json({
      success: true,
      documents: documentsDatabase,
      totalSpent,
      count: documentsDatabase.length,
      message: 'Documents loaded successfully'
    });

  } catch (error) {
    console.error('❌ API: Error loading documents:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to load documents',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log('💾 API: Unauthorized request');
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { documents, syncType, timestamp } = body;

    console.log('💾 API: Received request:', {
      hasDocuments: !!documents,
      documentsType: typeof documents,
      isArray: Array.isArray(documents),
      count: documents?.length || 0,
      syncType,
      user: session.user?.email,
      bodyKeys: Object.keys(body)
    });

    if (!documents) {
      console.log('💾 API: No documents in request body');
      return NextResponse.json({ 
        success: false, 
        message: 'No documents provided' 
      }, { status: 400 });
    }

    if (!Array.isArray(documents)) {
      console.log('💾 API: Documents is not an array:', typeof documents);
      return NextResponse.json({ 
        success: false, 
        message: 'Documents must be an array' 
      }, { status: 400 });
    }

    if (documents.length === 0) {
      console.log('💾 API: Empty documents array');
      return NextResponse.json({ 
        success: false, 
        message: 'Documents array is empty' 
      }, { status: 400 });
    }

    if (syncType === 'save') {
      // Merge with existing documents (avoid duplicates)
      const existingIds = new Set(documentsDatabase.map(doc => doc.id));
      const newDocuments = documents.filter(doc => !existingIds.has(doc.id));
      
      // Add new documents
      documentsDatabase = [...newDocuments, ...documentsDatabase];
      
      // Add timestamps
      documentsDatabase = documentsDatabase.map(doc => ({
        ...doc,
        updatedAt: new Date().toISOString(),
        createdAt: doc.createdAt || new Date().toISOString()
      }));

      console.log('✅ API: Documents saved successfully:', {
        totalDocuments: documentsDatabase.length,
        newDocuments: newDocuments.length
      });
    } else if (syncType === 'clear') {
      documentsDatabase = [];
      console.log('🧹 API: Database cleared');
    }

    // Calculate total spent
    const totalSpent = documentsDatabase.reduce((sum, doc) => {
      const amount = typeof doc.amount === 'string' ? 
        parseFloat(doc.amount.replace(/[₹,\s]/g, '')) || 0 : 
        (doc.amount || 0);
      return sum + amount;
    }, 0);

    return NextResponse.json({
      success: true,
      documents: documentsDatabase,
      totalSpent,
      count: documentsDatabase.length,
      message: 'Documents synchronized successfully'
    });

  } catch (error) {
    console.error('❌ API: Error saving documents:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to save documents',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    console.log('🧹 API: Clearing database for user:', session.user?.email);
    
    documentsDatabase = [];

    return NextResponse.json({
      success: true,
      message: 'Database cleared successfully'
    });

  } catch (error) {
    console.error('❌ API: Error clearing database:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to clear database',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
