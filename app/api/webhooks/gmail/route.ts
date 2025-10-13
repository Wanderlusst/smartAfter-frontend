import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { apiCache } from '@/app/lib/cache';

// Gmail webhook for real-time email notifications
export async function POST(request: Request) {
  try {
    // Verify webhook is from Gmail (basic security)
    const headersList = await headers();
    const googleToken = headersList.get('x-goog-resource-id');
    
    if (!googleToken) {
      
      return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 });
    }

    // Parse the webhook payload
    const body = await request.json();
    const { message } = body;
    
    if (!message?.data) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Decode the base64 message
    const decodedData = Buffer.from(message.data, 'base64').toString();
    const emailData = JSON.parse(decodedData);

    // Check if this is a purchase-related email
    if (await isPurchaseEmail(emailData)) {

      // Invalidate cache for the affected user
      const userEmail = emailData.emailAddress;
      if (userEmail) {
        apiCache.delete(`user:${userEmail}:purchases`);
        apiCache.delete(`user:${userEmail}:dashboard-initial`);

        // Could also trigger a push notification to connected clients here
        // await notifyConnectedClients(userEmail, 'new_purchase_email');
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Simple heuristic to detect purchase emails
async function isPurchaseEmail(emailData: any): Promise<boolean> {
  try {
    // You would implement more sophisticated logic here
    // For now, just check if it's likely a purchase email
    const subject = emailData.subject?.toLowerCase() || '';
    const from = emailData.from?.toLowerCase() || '';
    
    const purchaseKeywords = [
      'receipt', 'invoice', 'order', 'purchase', 'payment', 
      'confirmation', 'thank you for your order', 'order placed'
    ];
    
    const purchaseVendors = [
      'amazon', 'flipkart', 'myntra', 'swiggy', 'zomato', 
      'uber', 'ola', 'paytm', 'razorpay'
    ];

    return (
      purchaseKeywords.some(keyword => subject.includes(keyword)) ||
      purchaseVendors.some(vendor => from.includes(vendor))
    );
  } catch (error) {
    
    return false;
  }
}

// GET endpoint for webhook verification (Gmail setup)
export async function GET() {
  return NextResponse.json({
    message: 'Gmail webhook endpoint active',
    timestamp: new Date().toISOString(),
    status: 'ready'
  });
} 