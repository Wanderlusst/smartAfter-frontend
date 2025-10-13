// COMMENTED OUT - Dashboard Credit Card API disabled
// Focus is now on email parsing only
/*
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import fs from 'fs/promises';
import path from 'path';

const BACKEND_URL = process.env.CREDIT_CARD_PARSER_BACKEND_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Fetching credit card data for dashboard...');

    // Use sample PDF for now (you can integrate with Gmail later)
    const samplePdfPath = path.join(process.cwd(), 'sample', 'HDFC_Credit_Card_Statement.pdf');
    
    try {
      const pdfBuffer = await fs.readFile(samplePdfPath);
      const base64Pdf = pdfBuffer.toString('base64');

      // Create encrypted data payload
      const emailData = {
        pdfBuffer: base64Pdf,
        emailMetadata: {
          subject: 'Credit Card Statement - Dashboard Integration',
          from: session.user.email,
          messageId: `dashboard-${Date.now()}`
        }
      };

      const encryptedData = Buffer.from(JSON.stringify(emailData)).toString('base64');

      // Call backend credit card processing
      const response = await fetch(`${BACKEND_URL}/api/process-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          encryptedData: encryptedData,
          userInfo: {
            username: 'AKASH A S',
            dateOfBirth: '2711',
            email: session.user.email,
            bankName: 'HDFC'
          },
          password: 'AKAS2711'
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const creditCardResult = await response.json();
      
      if (!creditCardResult.success) {
        throw new Error(`Credit card processing failed: ${creditCardResult.error}`);
      }

      const creditCardData = creditCardResult.data;
      
      // Transform credit card data to dashboard format
      const dashboardData = {
        totalSpent: creditCardData.totalSpent || 0,
        purchaseCount: creditCardData.transactions?.length || 0,
        activeWarranties: 0, // Credit cards don't have warranties
        purchases: creditCardData.transactions?.map((tx: any, index: number) => ({
          id: `cc-${index}`,
          vendor: tx.merchant || tx.description || 'Unknown',
          amount: Math.abs(tx.amount) || 0,
          date: tx.date || new Date().toISOString(),
          subject: `Credit Card Transaction - ${tx.description}`,
          isInvoice: false,
          confidence: 0.95,
          source: 'credit-card',
          type: tx.type,
          category: tx.category
        })) || [],
        refundOpportunities: [],
        warranties: [],
        documents: {
          total: creditCardData.transactions?.length || 0,
          receipts: 0,
          invoices: 0,
          creditCardStatements: 1
        },
        refundable: {
          amount: 0,
          percentage: 0
        },
        monthlySpending: creditCardData.monthlyBreakdown || [],
        categories: creditCardData.categoryBreakdown?.reduce((acc: any, cat: any) => {
          acc[cat.category] = cat.count;
          return acc;
        }, {}) || {},
        hasInitialData: true,
        source: 'credit-card',
        fetchedAt: new Date().toISOString(),
        loading: false,
        creditCardData: {
          totalDue: creditCardData.totalDue,
          dueDate: creditCardData.dueDate,
          minimumDue: creditCardData.minimumDue,
          cardNumber: creditCardData.cardNumber,
          bank: creditCardData.bank
        }
      };

      console.log(`✅ Credit card dashboard data: ${dashboardData.purchaseCount} transactions, ₹${dashboardData.totalSpent} total`);

      return NextResponse.json({
        success: true,
        data: dashboardData,
        summary: {
          totalTransactions: dashboardData.purchaseCount,
          totalAmount: dashboardData.totalSpent,
          totalDue: creditCardData.totalDue,
          dueDate: creditCardData.dueDate,
          source: 'credit-card',
          processingTime: Date.now()
        }
      });

    } catch (fileError) {
      console.error('❌ Sample PDF not found, using fallback data:', fileError);
      
      // Fallback data if sample PDF not found
      const fallbackData = {
        totalSpent: 0,
        purchaseCount: 0,
        activeWarranties: 0,
        purchases: [],
        refundOpportunities: [],
        warranties: [],
        documents: { total: 0, receipts: 0, invoices: 0, creditCardStatements: 0 },
        refundable: { amount: 0, percentage: 0 },
        monthlySpending: [],
        categories: {},
        hasInitialData: false,
        source: 'fallback',
        fetchedAt: new Date().toISOString(),
        loading: false
      };

      return NextResponse.json({
        success: true,
        data: fallbackData,
        summary: {
          totalTransactions: 0,
          totalAmount: 0,
          source: 'fallback',
          message: 'No credit card data available'
        }
      });
    }

  } catch (error: any) {
    console.error('❌ Credit card dashboard error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to fetch credit card data' 
    }, { status: 500 });
  }
}
*/

// Placeholder API - Dashboard Credit Card disabled
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Dashboard Credit Card Analysis is temporarily disabled. Focus is on email parsing.' },
    { status: 503 }
  );
}
