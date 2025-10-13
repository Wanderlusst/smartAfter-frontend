// COMMENTED OUT - Credit Card Analysis API disabled
// Focus is now on email parsing only
/*
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ExtendedSession {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  user?: {
    email?: string;
  };
}

interface CreditCardData {
  transactions: Array<{
    date: string;
    description: string;
    amount: number;
  }>;
  summary: {
    totalSpent: number;
    statementPeriod: string;
    cardNumber: string;
  };
  monthlyBreakdown: Array<{
    month: string;
    amount: number;
  }>;
}


async function getGmailClient() {
  const session = await getServerSession(authOptions) as ExtendedSession | null;
  
  if (!session?.accessToken) {
    throw new Error('Not authenticated - Please log in with your Google account');
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth credentials not configured');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
    expiry_date: (session.expiresAt || 0) * 1000,
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

async function searchCreditCardEmails(gmail: any) {
  try {
    // Search for credit card statement emails in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateQuery = thirtyDaysAgo.toISOString().split('T')[0].replace(/-/g, '/');

    // Search for various credit card statement email patterns
    const queries = [
      `subject:"Credit Card Statement" after:${dateQuery}`,
      `subject:"Statement" from:"axisbank.com" after:${dateQuery}`,
      `subject:"Statement" from:"hdfc" after:${dateQuery}`,
      `subject:"Statement" from:"icici" after:${dateQuery}`,
      `subject:"Statement" from:"sbi" after:${dateQuery}`,
      `subject:"Statement" from:"kotak" after:${dateQuery}`,
      `from:"axisbank.com" after:${dateQuery}`,
      `from:"hdfc" after:${dateQuery}`,
      `from:"icici" after:${dateQuery}`,
      `from:"sbi" after:${dateQuery}`,
      `from:"kotak" after:${dateQuery}`
    ];
    
    let allMessages = [];
    
    for (const query of queries) {
      try {
        const response = await gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: 5
        });
        
        if (response.data.messages) {
          allMessages = allMessages.concat(response.data.messages);
        }
      } catch (error) {
        console.log(`Query failed: ${query}`, error.message);
        continue;
      }
    }
    
    // Remove duplicates based on message ID
    const uniqueMessages = allMessages.filter((message, index, self) => 
      index === self.findIndex(m => m.id === message.id)
    );
    
    return uniqueMessages;
  } catch (error) {
    console.error('Error searching for credit card emails:', error);
    throw new Error('Failed to search for credit card emails');
  }
}

async function getEmailWithAttachments(gmail: any, messageId: string) {
  try {
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    const message = response.data;
    const parts = message.payload?.parts || [];
    
    // Find PDF attachments
    const pdfAttachments = [];
    
    for (const part of parts) {
      if (part.mimeType === 'application/pdf' && part.body?.attachmentId) {
        pdfAttachments.push({
          filename: part.filename || 'credit-card-statement.pdf',
          attachmentId: part.body.attachmentId,
          size: part.body.size || 0
        });
      }
      
      // Check nested parts
      if (part.parts) {
        for (const subPart of part.parts) {
          if (subPart.mimeType === 'application/pdf' && subPart.body?.attachmentId) {
            pdfAttachments.push({
              filename: subPart.filename || 'credit-card-statement.pdf',
              attachmentId: subPart.body.attachmentId,
              size: subPart.body.size || 0
            });
          }
        }
      }
    }

    return {
      message,
      pdfAttachments
    };
  } catch (error) {
    console.error('Error getting email with attachments:', error);
    throw new Error('Failed to get email attachments');
  }
}

async function downloadAttachment(gmail: any, messageId: string, attachmentId: string) {
  try {
    const response = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: messageId,
      id: attachmentId
    });

    // Decode base64url to base64
    const base64Data = response.data.data;
    const base64 = base64Data.replace(/-/g, '+').replace(/_/g, '/');
    
    return Buffer.from(base64, 'base64');
  } catch (error) {
    console.error('Error downloading attachment:', error);
    throw new Error('Failed to download PDF attachment');
  }
}

async function getUserInfoForPasswordGeneration(userEmail?: string) {
  try {
    if (!userEmail) {
      console.log('⚠️ No user email provided');
      return {};
    }

    console.log('🔍 Looking for credit card settings for user:', userEmail);

    // Get user settings from Supabase using user_id field
    const { data: settings, error } = await supabase
      .from('credit_card_settings')
      .select('first_name, last_name, date_of_birth, user_id')
      .eq('user_id', userEmail)
      .single();
    
    console.log('📊 Supabase query result:', {
      userEmail: userEmail,
      settings: settings,
      error: error,
      hasSettings: !!settings
    });

    // If still not found, try to get all records to see what's there
    if (error || !settings) {
      console.log('⚠️ No credit card settings found, checking all records...');
      const { data: allSettings, error: allError } = await supabase
        .from('credit_card_settings')
        .select('*')
        .limit(5);
      
      console.log('📋 All credit card settings:', allSettings);
      console.log('❌ Error details:', error);
      return { email: userEmail };
    }

    console.log('✅ Found credit card settings:', settings);

    // Generate username from first and last name (first 4 letters for password)
    const fullName = `${settings.first_name}${settings.last_name}`.toUpperCase();
    const username = fullName.substring(0, 4); // First 4 letters for password generation
    console.log('🔐 Generated username for password generation:', username);
    console.log('📝 Full name:', fullName);

    // Convert date from DD/MM/YYYY to YYYY-MM-DD format for password generation
    let formattedDateOfBirth = settings.date_of_birth;
    if (settings.date_of_birth && settings.date_of_birth.includes('/')) {
      const [day, month, year] = settings.date_of_birth.split('/');
      formattedDateOfBirth = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    console.log('📅 Date conversion:', {
      original: settings.date_of_birth,
      formatted: formattedDateOfBirth
    });

    return {
      username: username,
      dateOfBirth: formattedDateOfBirth,
      bankName: settings.bank_name || 'HDFC', // Default to HDFC if not specified
      cardNumber: settings.card_number,
      mobileNumber: settings.mobile_number,
      email: userEmail
    };
  } catch (error) {
    console.error('Error getting user info:', error);
    return { email: userEmail };
  }
}

async function processEmailWithBackend(pdfBuffer: Buffer, password: string, userInfo: any, emailMetadata: any): Promise<CreditCardData> {
  try {
    const backendUrl = process.env.CREDIT_CARD_BACKEND_URL || 'http://localhost:3001';
    
    // Prepare encrypted email data
    const emailData = {
      pdfBuffer: pdfBuffer.toString('base64'),
      emailMetadata: {
        subject: emailMetadata.subject,
        from: emailMetadata.from,
        date: emailMetadata.date,
        messageId: emailMetadata.messageId
      }
    };
    
    // Encrypt the email data (base64 encode for simplicity)
    const encryptedData = Buffer.from(JSON.stringify(emailData)).toString('base64');
    
    const response = await fetch(`${backendUrl}/api/process-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        encryptedData,
        password: password,
        userInfo: {
          username: userInfo.username,
          dateOfBirth: userInfo.dateOfBirth,
          bankName: userInfo.bankName,
          cardNumber: userInfo.cardNumber,
          mobileNumber: userInfo.mobileNumber,
          email: userInfo.email
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Backend email processing failed');
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Backend email processing failed');
    }

    return result.data;
  } catch (error) {
    console.error('Backend email processing error:', error);
    throw error;
  }
}


export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    console.log('🔍 Starting credit card analysis...');

    // Get Gmail client
    let gmail;
    try {
      gmail = await getGmailClient();
      console.log('✅ Gmail client initialized successfully');
    } catch (authError) {
      console.error('❌ Gmail authentication error:', authError);
      console.log('⚠️ Gmail authentication failed, trying sample PDF fallback...');
      console.log('🔍 Auth error details:', {
        message: authError.message,
        name: authError.name,
        stack: authError.stack
      });
      
      // Try to use sample PDF for testing when Gmail authentication fails
      try {
        const fs = require('fs');
        const path = require('path');
        const samplePdfPath = path.join(process.cwd(), '..', 'credit-card-backend', 'src', 'sample', 'Credit Card Statement.pdf');
        
        if (fs.existsSync(samplePdfPath)) {
          console.log('📄 Found sample PDF, using it for testing...');
          const pdfBuffer = fs.readFileSync(samplePdfPath);
          
          const userInfo = await getUserInfoForPasswordGeneration('test@example.com');
          console.log('👤 User info for password generation:', userInfo);
          
          const emailMetadata = {
            subject: 'Credit Card Statement - Sample',
            from: 'noreply@axisbank.com',
            date: new Date().toISOString(),
            messageId: 'sample-test'
          };
          
          const creditCardData = await processEmailWithBackend(pdfBuffer, password, userInfo, emailMetadata);
          console.log('✅ Sample PDF processed successfully');
          
          return NextResponse.json(creditCardData);
        } else {
          console.log('❌ No sample PDF found');
          return NextResponse.json(
            { error: 'Please log in with your Google account to access Gmail' },
            { status: 401 }
          );
        }
      } catch (sampleError) {
        console.error('❌ Sample PDF processing failed:', sampleError);
        return NextResponse.json(
          { error: 'Please log in with your Google account to access Gmail' },
          { status: 401 }
        );
      }
    }

    // Get user info for password generation
    const session = await getServerSession(authOptions) as ExtendedSession | null;
    console.log('🔐 Session info:', {
      hasSession: !!session,
      userEmail: session?.user?.email,
      userId: session?.user?.id,
      sessionUser: session?.user
    });
    
    if (!session?.user?.email) {
      console.log('⚠️ No user session found, trying sample PDF fallback...');
      
      // Try to use sample PDF for testing when no Gmail access
      try {
        const fs = require('fs');
        const path = require('path');
        const samplePdfPath = path.join(process.cwd(), '..', 'credit-card-backend', 'src', 'sample', 'Credit Card Statement.pdf');
        
        if (fs.existsSync(samplePdfPath)) {
          console.log('📄 Found sample PDF, using it for testing...');
          const pdfBuffer = fs.readFileSync(samplePdfPath);
          
          const userInfo = await getUserInfoForPasswordGeneration('test@example.com');
          console.log('👤 User info for password generation:', userInfo);
          
          const emailMetadata = {
            subject: 'Credit Card Statement - Sample',
            from: 'noreply@axisbank.com',
            date: new Date().toISOString(),
            messageId: 'sample-test'
          };
          
          const creditCardData = await processEmailWithBackend(pdfBuffer, password, userInfo, emailMetadata);
          console.log('✅ Sample PDF processed successfully');
          
          return NextResponse.json(creditCardData);
        } else {
          console.log('❌ No sample PDF found');
          return NextResponse.json(
            { error: 'Please log in with your Google account to access this feature' },
            { status: 401 }
          );
        }
      } catch (sampleError) {
        console.error('❌ Sample PDF processing failed:', sampleError);
        return NextResponse.json(
          { error: 'Please log in with your Google account to access this feature' },
          { status: 401 }
        );
      }
    }
    
    const userInfo = await getUserInfoForPasswordGeneration(session?.user?.email);
    console.log('👤 User info for password generation:', userInfo);

    // Search for credit card statement emails
    console.log('🔍 Searching for credit card statement emails...');
    const messages = await searchCreditCardEmails(gmail);
    console.log(`📧 Found ${messages.length} credit card statement emails`);
    
    if (messages.length > 0) {
      console.log('📧 Email IDs found:', messages.map(m => m.id));
    }

    // Collect all credit card data from multiple emails
    let allCreditCardData: CreditCardData[] = [];
    let creditCardData: CreditCardData | null = null;

    if (messages.length === 0) {
      console.log('⚠️ No credit card statement emails found');
      
      // For testing purposes, try to use the sample PDF if available
      console.log('🧪 Trying to use sample PDF for testing...');
      try {
        const fs = require('fs');
        const path = require('path');
        const samplePdfPath = path.join(process.cwd(), '..', 'credit-card-backend', 'src', 'sample', 'Credit Card Statement.pdf');
        
        if (fs.existsSync(samplePdfPath)) {
          console.log('📄 Found sample PDF, using it for testing...');
          const pdfBuffer = fs.readFileSync(samplePdfPath);
          
          const emailMetadata = {
            subject: 'Credit Card Statement - Sample',
            from: 'noreply@axisbank.com',
            date: new Date().toISOString(),
            messageId: 'sample-test'
          };
          
          creditCardData = await processEmailWithBackend(pdfBuffer, password, userInfo, emailMetadata);
          console.log('✅ Sample PDF processed successfully');
        } else {
          console.log('❌ No sample PDF found');
          return NextResponse.json(
            { error: 'No credit card statement emails found in the last 30 days' },
            { status: 404 }
          );
        }
      } catch (sampleError) {
        console.error('❌ Sample PDF processing failed:', sampleError);
        return NextResponse.json(
          { error: 'No credit card statement emails found in the last 30 days' },
          { status: 404 }
        );
      }
    }

    console.log('📄 Processing emails for PDF attachments...');

    for (const message of messages) {
      try {
        console.log(`📧 Processing message ${message.id}...`);
        const { message: emailMessage, pdfAttachments } = await getEmailWithAttachments(gmail, message.id!);

        if (pdfAttachments.length === 0) {
          console.log('⚠️ No PDF attachments found in this email');
          continue; // Skip if no PDF attachments
        }

        console.log(`📎 Found ${pdfAttachments.length} PDF attachments`);

        // Download the first PDF attachment
        const pdfBuffer = await downloadAttachment(gmail, message.id!, pdfAttachments[0].attachmentId);
        console.log(`📥 Downloaded PDF (${pdfBuffer.length} bytes)`);
        console.log(`📎 PDF filename: ${pdfAttachments[0].filename}`);
        
        // Log PDF details for debugging
        console.log('📊 PDF Details:', {
          filename: pdfAttachments[0].filename,
          fileSize: pdfBuffer.length,
          firstBytes: pdfBuffer.slice(0, 10).toString('hex'),
          isPDF: pdfBuffer.slice(0, 4).toString() === '%PDF',
          base64Length: pdfBuffer.toString('base64').length,
          messageId: message.id
        });

        try {
          // Prepare email metadata
          const emailMetadata = {
            subject: emailMessage.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || 'Unknown Subject',
            from: emailMessage.payload?.headers?.find((h: any) => h.name === 'From')?.value || 'Unknown Sender',
            date: emailMessage.payload?.headers?.find((h: any) => h.name === 'Date')?.value || new Date().toISOString(),
            messageId: message.id
          };

          // Process email with backend service
          console.log('🔍 Processing email with backend service...');
          console.log('📤 Sending to backend:', {
            hasUserInfo: !!userInfo,
            userInfo: userInfo,
            pdfSize: pdfBuffer.length,
            emailSubject: emailMetadata.subject,
            emailFrom: emailMetadata.from
          });
          
          try {
            const cardData = await processEmailWithBackend(pdfBuffer, password, userInfo, emailMetadata);
            console.log('✅ Email processed successfully with backend');
            console.log('📊 Backend result:', {
              success: true,
              transactionCount: cardData?.transactions?.length || 0,
              totalSpent: cardData?.summary?.totalSpent || 0
            });
            
            // Add to collection of all cards
            allCreditCardData.push(cardData);
            
            // Set as the main card data (for backward compatibility)
            if (!creditCardData) {
              creditCardData = cardData;
            }
            
            console.log(`📊 Collected ${allCreditCardData.length} credit card(s) so far`);
          } catch (backendError) {
            console.error('❌ Backend processing error:', backendError);
            console.log('❌ Backend error details:', {
              message: backendError.message,
              stack: backendError.stack
            });
            // Don't throw, continue with next email
            continue;
          }
        } catch (parseError) {
          console.error('❌ Backend email processing error:', parseError);
          console.log('❌ Backend email processing failed, trying next email');
          continue; // Try next email
        }
      } catch (error) {
        console.error('❌ Error processing email:', error);
        continue; // Try next email
      }
    }

    if (allCreditCardData.length === 0) {
      console.log('⚠️ Could not parse any PDFs');
      
      return NextResponse.json(
        { error: 'Could not parse any credit card statement PDFs' },
        { status: 400 }
      );
    }

    console.log(`✅ Returning parsed credit card data for ${allCreditCardData.length} card(s)`);
    
    // If multiple cards, return aggregated data
    if (allCreditCardData.length > 1) {
      const aggregatedData = {
        ...creditCardData, // Use first card as base
        multipleCards: true,
        totalCards: allCreditCardData.length,
        allCards: allCreditCardData,
        totalTransactions: allCreditCardData.reduce((sum, card) => sum + (card.transactions?.length || 0), 0),
        totalSpent: allCreditCardData.reduce((sum, card) => sum + (card.summary?.totalSpent || 0), 0),
        totalDue: allCreditCardData.reduce((sum, card) => sum + (card.totalDue || 0), 0)
      };
      return NextResponse.json(aggregatedData);
    }
    
    return NextResponse.json(creditCardData);

  } catch (error) {
    console.error('❌ Credit card analysis error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Not authenticated')) {
        return NextResponse.json(
          { error: 'Please log in with your Google account to access Gmail' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
*/

// Placeholder API - Credit Card Analysis disabled
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Credit Card Analysis is temporarily disabled. Focus is on email parsing.' },
    { status: 503 }
  );
}
