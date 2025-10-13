import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { createServerClient } from '@/app/lib/supabaseClient';

// Ensure we're in a server environment
if (typeof window !== 'undefined') {
  throw new Error('Gmail functions can only be called on the server side');
}

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

interface ExtendedSession {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export async function getGmailClient() {
  const session = await getServerSession(authOptions) as ExtendedSession | null;
  
  console.log('🔐 GMAIL AUTH DEBUG - Session details:', {
    hasSession: !!session,
    hasAccessToken: !!session?.accessToken,
    hasRefreshToken: !!session?.refreshToken,
    expiresAt: session?.expiresAt,
    userEmail: session?.user?.email
  });
  
  if (!session?.accessToken) {
    console.error('❌ GMAIL AUTH ERROR - No access token found');
    throw new Error('Not authenticated - Please log in with your Google account');
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('❌ GMAIL AUTH ERROR - Missing OAuth credentials');
    throw new Error('Google OAuth credentials not configured - Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables');
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

  console.log('🔐 GMAIL AUTH DEBUG - OAuth2 client configured with:', {
    hasAccessToken: !!session.accessToken,
    hasRefreshToken: !!session.refreshToken,
    expiryDate: session.expiresAt ? new Date(session.expiresAt * 1000).toISOString() : 'No expiry',
    isExpired: session.expiresAt ? Date.now() > (session.expiresAt * 1000) : false
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

// FIXED: Enhanced search function with working Gmail query patterns
export async function searchEmails(query: string, maxResults: number = 100) {
  try {
    
    const gmail = await getGmailClient();

    // FIXED: Replace problematic queries with working ones
    let workingQuery = query;
    
    // Replace in:primary with in:inbox (which works)
    if (query.includes('in:primary')) {
      workingQuery = query.replace('in:primary', 'in:inbox');
    }
    
    // Remove date filters that don't work
    if (query.includes('newer_than:') || query.includes('after:') || query.includes('before:')) {
      workingQuery = workingQuery.replace(/\s*(newer_than|after|before):[^\s]+/g, '');
    }

    // FIXED: Use working Gmail API parameters
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: workingQuery,
      maxResults,
    });

    const messages = res.data.messages || [];
    
          // Log the emails found by the search
      console.log(`📧 Found ${messages.length} emails for query: "${query}"`);

      // If we have messages, get basic details for logging
    if (messages.length > 0) {
      try {
        // Get basic details for first few messages to show what we found
        const sampleMessages = messages.slice(0, Math.min(5, messages.length));
        const sampleDetails = await Promise.all(
          sampleMessages.map(async (msg) => {
            try {
              const detailRes = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id!,
                format: 'metadata',
                metadataHeaders: ['Subject', 'From', 'Date']
              });
              
              const headers = detailRes.data.payload?.headers || [];
              const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
              const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
              const date = headers.find((h: any) => h.name === 'Date')?.value || 'No Date';
              
              // Log each email being processed
              console.log(`📧 Email: ${from} | ${subject} | ${date}`);
              
              return {
                messageId: msg.id,
                subject,
                from,
                date
              };
            } catch (err) {
              
              return {
                messageId: msg.id,
                subject: 'Error fetching details',
                from: 'Error',
                date: 'Error'
              };
            }
          })
        );

      } catch (detailError) {
        
      }
    } else {
      
    }

    return messages;
  } catch (error: any) {

    // Provide more specific error messages
    if (error.code === 401) {
      throw new Error('Gmail access token expired or invalid - Please re-authenticate');
    } else if (error.code === 403) {
      throw new Error('Gmail access denied - Please ensure you have granted Gmail read permissions');
    } else if (error.code === 429) {
      throw new Error('Gmail API rate limit exceeded - Please try again later');
    } else if (error.message?.includes('Not authenticated')) {
      throw new Error('Not authenticated - Please log in with your Google account');
    } else {
      throw new Error(`Gmail search failed: ${error.message || 'Unknown error'}`);
    }
  }
}

// Improved batch email fetching with better error handling and rate limiting
export async function getEmailDetailsBatch(messageIds: string[]) {
  try {
    const gmail = await getGmailClient();
    
    // Process in smaller batches to avoid rate limiting
    const batchSize = 3; // Reduced to avoid rate limits
    const results = [];
    
    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (id) => {
        try {
          const res = await gmail.users.messages.get({
            userId: 'me',
            id: id,
            format: 'full',
          });
          return res.data;
        } catch (err) {
          
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(Boolean));
      
      // Add delay between batches to avoid rate limiting
      if (i + batchSize < messageIds.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    return results;
  } catch (error) {
    
    return [];
  }
}

export async function getEmailDetails(messageId: string) {
  try {
    const gmail = await getGmailClient();
    const res = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    return res.data;
  } catch (error) {
    
    throw error;
  }
}

// Enhanced email content parsing
function parseEmailContent(email: any) {
  const headers = email.payload?.headers || [];
  const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
  const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown Sender';
  const date = headers.find((h: any) => h.name === 'Date')?.value || '';
  const messageId = email.id || '';
  
  // Extract body with better handling for HTML and text parts
  let body = '';
  let htmlBody = '';
  
  if (email.payload?.body?.data) {
    body = Buffer.from(email.payload.body.data, 'base64').toString('utf-8');
  } else if (email.payload?.parts) {
    // Handle multipart messages
    const textPart = email.payload.parts.find((part: any) => part.mimeType === 'text/plain');
    const htmlPart = email.payload.parts.find((part: any) => part.mimeType === 'text/html');
    
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
    }
    
    if (htmlPart?.body?.data) {
      htmlBody = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
      // Strip HTML tags for text analysis
      body = body || htmlBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    }
  }

  return {
    subject,
    from,
    date,
    body,
    htmlBody,
    messageId,
  };
}

// Enhanced amount extraction with more patterns
function extractAmount(text: string): string {
  // Multiple regex patterns for different currency formats
  const patterns = [
    // Direct currency symbols - ENHANCED
    /₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/g,           // ₹70.8, ₹1,234.56
    /INR\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,       // INR 70.8
    /Rs\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,     // Rs. 70.8, Rs 70.8
    /\$\s*([0-9,]+(?:\.[0-9]{1,2})?)/g,         // $70.8, $1,234.56
    /USD\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,       // USD 70.8
    /€\s*([0-9,]+(?:\.[0-9]{1,2})?)/g,          // €70.8
    
    // Contextual patterns - ENHANCED
    /total[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Total: ₹70.8
    /amount[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Amount: ₹70.8
    /grand\s*total[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Grand Total: ₹70.8
    /paid[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Paid: ₹70.8
    /subtotal[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Subtotal: ₹70.8
    /bill[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Bill: ₹70.8
    /price[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Price: ₹70.8
    /cost[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Cost: ₹70.8
    /worth[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Worth: ₹70.8
    /for[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // For: ₹70.8
    
    // Order specific patterns
    /order\s*total[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Order Total: ₹70.8
    /order\s*amount[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Order Amount: ₹70.8
    /order\s*value[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Order Value: ₹70.8
    
    // Receipt/Invoice patterns
    /receipt[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Receipt: ₹70.8
    /invoice[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Invoice: ₹70.8
    
    // Movie ticket specific patterns
    /total\s*amount[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Total Amount: ₹70.8
    /booking\s*charge[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Booking Charge: ₹70.8
    /cinema[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Cinema: ₹70.8
    /movie[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Movie: ₹70.8
    /ticket[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // Ticket: ₹70.8
    
    // Loose number patterns with currency context
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*rupees?/gi,     // 70.8 rupees
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*inr/gi,         // 70.8 INR
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*rs\.?/gi,       // 70.8 Rs
    
    // Additional patterns for various formats
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*\/-/gi,          // 70.8/-
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*only/gi,        // 70.8 only
    
    // NEW: More flexible patterns for common email formats
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*₹/g,            // 70.8 ₹ (reverse order)
    
    // NEW: HTML entity patterns
    /&#8377;\s*([0-9,]+(?:\.[0-9]{1,2})?)/g,      // &#8377;70.8 (₹ HTML entity)
    /&rsquo;\s*([0-9,]+(?:\.[0-9]{1,2})?)/g,      // &rsquo;70.8
    
    // NEW: Common email patterns
    /total[:\s]*([0-9,]+(?:\.[0-9]{1,2})?)/gi,    // Total: 70.8
    /amount[:\s]*([0-9,]+(?:\.[0-9]{1,2})?)/gi,   // Amount: 70.8
    /bill[:\s]*([0-9,]+(?:\.[0-9]{1,2})?)/gi,     // Bill: 70.8
    /charge[:\s]*([0-9,]+(?:\.[0-9]{1,2})?)/gi,   // Charge: 70.8
    /payment[:\s]*([0-9,]+(?:\.[0-9]{1,2})?)/gi,  // Payment: 70.8
    
    // NEW: Standalone numbers that might be amounts (be more permissive)
    /([1-9][0-9,]+(?:\.[0-9]{1,2})?)/g,           // Any number >= 10
  ];
  
  let bestMatch = null;
  let highestAmount = 0;
  
  for (const pattern of patterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      // Extract the numeric part and clean it
      const numericMatch = match[0].match(/([0-9,]+(?:\.[0-9]{1,2})?)/);
      if (numericMatch) {
        const amount = numericMatch[1].replace(/,/g, '');
        const numAmount = parseFloat(amount);
        if (!isNaN(numAmount) && numAmount > 0) {
          // Keep the highest amount found (likely the total)
          if (numAmount > highestAmount) {
            highestAmount = numAmount;
            bestMatch = `₹${numAmount}`;
          }
        }
      }
    }
  }
  
  return bestMatch || 'N/A';
}

// Function to get PDF attachments from email
function getPdfAttachments(email: any): Array<{id: string, filename: string}> {
  const attachments: Array<{id: string, filename: string}> = [];
  
  function extractAttachments(parts: any[]) {
    for (const part of parts) {
      if (part.filename && part.filename.toLowerCase().endsWith('.pdf') && part.body?.attachmentId) {
        attachments.push({
          id: part.body.attachmentId,
          filename: part.filename
        });
      }
      
      if (part.parts) {
        extractAttachments(part.parts);
      }
    }
  }
  
  if (email.payload?.parts) {
    extractAttachments(email.payload.parts);
  }
  
  return attachments;
}

// Enhanced extractPurchases function with broader search and database integration
export async function extractPurchases(days: number = 90) {
  try {
    
    const startTime = Date.now();
    
    // Check authentication first
    let gmail;
    try {
      gmail = await getGmailClient();
      
    } catch (authError) {
      
      throw new Error(`Gmail authentication failed: ${authError}`);
    }
    
    // Get user session for database operations
    const session = await getServerSession(authOptions) as ExtendedSession | null;
    const userId = session?.user?.email;
    
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Initialize Supabase client
    const supabase = createServerClient();
    
    // Calculate date range for filtering
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Search for ALL invoice and purchase-related emails with comprehensive queries
    let messages;
    try {
      // FIXED: Search queries that exclude promotional emails
      const searchQueries = [
        // Invoice-specific searches WITHOUT date filtering - EXCLUDE PROMOTIONAL
        `in:primary -is:promotional -is:marketing -subject:("unsubscribe" OR "marketing" OR "promotion" OR "offer" OR "deal" OR "discount" OR "newsletter" OR "the best lesson" OR "what if you never open" OR "this changes everything" OR "and it begins") subject:(invoice OR receipt OR bill OR payment OR transaction)`,
        `in:primary -is:promotional -is:marketing -subject:("unsubscribe" OR "marketing" OR "promotion" OR "offer" OR "deal" OR "discount" OR "newsletter" OR "the best lesson" OR "what if you never open" OR "this changes everything" OR "and it begins") subject:(order OR purchase OR confirmation OR "thank you for your order")`,
        `in:primary -is:promotional -is:marketing -subject:("unsubscribe" OR "marketing" OR "promotion" OR "offer" OR "deal" OR "discount" OR "newsletter" OR "the best lesson" OR "what if you never open" OR "this changes everything" OR "and it begins") subject:(delivery OR shipped OR "out for delivery" OR "order confirmed")`,
        `in:primary -is:promotional -is:marketing -subject:("unsubscribe" OR "marketing" OR "promotion" OR "offer" OR "deal" OR "discount" OR "newsletter" OR "the best lesson" OR "what if you never open" OR "this changes everything" OR "and it begins") subject:(payment OR transaction OR "payment successful" OR "payment received")`,
        `in:primary -is:promotional -is:marketing -from:(amazon.in OR flipkart.com OR myntra.com OR paytm.com OR razorpay.com OR uber.com OR ola.com) -from:("noreply@mailers.zomato.com" OR "mailers.zomato.com")`,
        `in:primary -is:promotional -is:marketing -subject:("unsubscribe" OR "marketing" OR "promotion" OR "offer" OR "deal" OR "discount" OR "newsletter" OR "the best lesson" OR "what if you never open" OR "this changes everything" OR "and it begins") subject:(restaurant OR food OR delivery OR booking OR reservation)`,
        `in:primary -is:promotional -is:marketing -subject:("unsubscribe" OR "marketing" OR "promotion" OR "offer" OR "deal" OR "discount" OR "newsletter" OR "the best lesson" OR "what if you never open" OR "this changes everything" OR "and it begins") subject:(cinema OR movie OR ticket OR entertainment)`,
        `in:primary -is:promotional -is:marketing -subject:("unsubscribe" OR "marketing" OR "promotion" OR "offer" OR "deal" OR "discount" OR "newsletter" OR "the best lesson" OR "what if you never open" OR "this changes everything" OR "and it begins") subject:(shopping OR online OR ecommerce OR store)`,
        `in:primary -is:promotional -is:marketing -subject:("unsubscribe" OR "marketing" OR "promotion" OR "offer" OR "deal" OR "discount" OR "newsletter" OR "the best lesson" OR "what if you never open" OR "this changes everything" OR "and it begins") subject:(bank OR credit OR debit OR card OR upi)`,
        `in:primary -is:promotional -is:marketing -subject:("unsubscribe" OR "marketing" OR "promotion" OR "offer" OR "deal" OR "discount" OR "newsletter" OR "the best lesson" OR "what if you never open" OR "this changes everything" OR "and it begins") subject:(utility OR electricity OR water OR gas OR internet OR mobile)`,
        `in:primary -is:promotional -is:marketing -subject:("unsubscribe" OR "marketing" OR "promotion" OR "offer" OR "deal" OR "discount" OR "newsletter" OR "the best lesson" OR "what if you never open" OR "this changes everything" OR "and it begins") subject:(insurance OR premium OR policy)`,
        `in:primary -is:promotional -is:marketing -subject:("unsubscribe" OR "marketing" OR "promotion" OR "offer" OR "deal" OR "discount" OR "newsletter" OR "the best lesson" OR "what if you never open" OR "this changes everything" OR "and it begins") subject:(subscription OR renewal OR membership)`,
        `in:primary -is:promotional -is:marketing -subject:("unsubscribe" OR "marketing" OR "promotion" OR "offer" OR "deal" OR "discount" OR "newsletter" OR "the best lesson" OR "what if you never open" OR "this changes everything" OR "and it begins") subject:(travel OR flight OR hotel OR booking)`,
        `in:primary subject:(healthcare OR medical OR pharmacy)`,
        `in:primary subject:(education OR course OR training)`,
        `in:primary subject:(service OR repair OR maintenance)`,
        
        // Body content searches for invoices WITHOUT date filtering
        `in:primary body:(invoice OR receipt OR bill OR payment OR transaction)`,
        `in:primary body:(total OR amount OR price OR cost OR worth)`,
        `in:primary body:(₹ OR INR OR Rs OR $ OR USD)`,
        
        // From specific domains that commonly send invoices WITHOUT date filtering
        `in:primary from:*@swiggy.com OR in:primary from:*@zomato.com OR in:primary from:*@amazon.in OR in:primary from:*@flipkart.com`,
        `in:primary from:*@paytm.com OR in:primary from:*@razorpay.com OR in:primary from:*@uber.com OR in:primary from:*@ola.com`,
        `in:primary from:*@myntra.com OR in:primary from:*@nykaa.com OR in:primary from:*@bigbasket.com`,
        `in:primary from:*@bookmyshow.com OR in:primary from:*@netflix.com OR in:primary from:*@primevideo.com`,
        `in:primary from:*@hotstar.com OR in:primary from:*@sonyliv.com OR in:primary from:*@voot.com`,
        `in:primary from:*@airtel.com OR in:primary from:*@jio.com OR in:primary from:*@vodafone.com`,
        `in:primary from:*@sbi.co.in OR in:primary from:*@hdfcbank.com OR in:primary from:*@icicibank.com`,
        `in:primary from:*@axisbank.com OR in:primary from:*@kotak.com OR in:primary from:*@yesbank.in`,
      ];
      
      const allMessages = [];
      for (const query of searchQueries) {
        try {
          
          const results = await searchEmails(query, 50);
          allMessages.push(...results);
          
        } catch (err) {
          
        }
      }
      
      // Remove duplicates based on message ID
      const uniqueMessages = allMessages.filter((msg, index, self) => 
        index === self.findIndex(m => m.id === msg.id)
      );
      
      messages = uniqueMessages;

      // Log first few message IDs for debugging
      if (messages.length > 0) {
        
      }
    } catch (searchError) {
      
      throw new Error(`Email search failed: ${searchError}`);
    }
    
    if (messages.length === 0) {
      
      return [];
    }
    
    // Extract message IDs for batch processing
    const messageIds = messages.map(msg => msg.id!).filter(Boolean);

    // Process emails in batches to reduce API calls
    const batchSize = 5; // Reduced batch size for better reliability
    const purchases = [];
    
    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);

      try {
        const emails = await getEmailDetailsBatch(batch);

        for (const email of emails) {
          if (!email) {
            
            continue;
          }
          
                      try {
              // Log the email being processed for purchase extraction
              console.log(`🔍 Processing email for purchase: ${email.id}`);
              
              const parsed = parseEmailContent(email);

            // Skip promotional emails
            const subjectLower = parsed.subject.toLowerCase();
            const fromLower = parsed.from.toLowerCase();
            
            if (subjectLower.includes('the best lesson') ||
                subjectLower.includes('what if you never open') ||
                subjectLower.includes('this changes everything') ||
                subjectLower.includes('and it begins') ||
                subjectLower.includes('what happens when we come together') ||
                subjectLower.includes('unsubscribe') ||
                subjectLower.includes('marketing') ||
                subjectLower.includes('promotion') ||
                subjectLower.includes('offer') ||
                subjectLower.includes('deal') ||
                subjectLower.includes('discount') ||
                subjectLower.includes('newsletter') ||
                fromLower.includes('noreply@mailers.zomato.com') ||
                fromLower.includes('mailers.zomato.com')) {
              console.log('🚫 FILTERED - Promotional email skipped in extractPurchases:', {
                subject: parsed.subject,
                from: parsed.from,
                reason: 'Promotional content detected'
              });
              continue;
            }

            // Extract amount from both subject and body
            const searchText = `${parsed.subject} ${parsed.body}`;
            let amount = extractAmount(searchText);
            
            // If amount not found in text, try to extract from subject patterns
            if (amount === 'N/A') {
              amount = extractAmountFromSubject(parsed.subject);
            }

            // Clean up vendor name
            let vendor = parsed.from.split('<')[0].trim();
            if (vendor.includes('"')) {
              vendor = vendor.replace(/"/g, '').trim();
            }
            
            // Determine if this is an invoice/purchase email
            const isInvoiceEmail = isInvoiceRelated(parsed.subject, parsed.body);
            const isPurchase = isPurchaseRelated(parsed.subject, parsed.body, vendor);

            // Debug logging
            console.log(`🔍 Email analysis: "${parsed.subject}" from "${vendor}"`);
            console.log(`   Amount: ${amount}, Invoice: ${isInvoiceEmail}, Purchase: ${isPurchase}`);

            // More inclusive: add if it looks like a purchase email, even without amount
            if (amount !== 'N/A' || isInvoiceEmail || isPurchase) {
              const finalAmount = amount !== 'N/A' ? amount : '₹1'; // Default to ₹1 if no amount found
              const purchase = {
                id: email.id || `email-${Date.now()}-${Math.random()}`,
                vendor,
                amount: finalAmount,
                date: parsed.date,
                subject: parsed.subject,
                messageId: parsed.messageId,
                isInvoice: isInvoiceEmail,
              };
              
              // Log the extracted purchase
              console.log(`✅ Extracted purchase: ${vendor} - ${finalAmount} (Invoice: ${isInvoiceEmail}) - Subject: "${parsed.subject}"`);

              purchases.push(purchase);
              
              // Database storage disabled to prevent connection errors
              // try {
              //   await storePurchaseInDatabase(supabase, userId, purchase);
              // } catch (dbError) {
              //   
              // }
            } else {
              console.log(`❌ Skipped email: "${parsed.subject}" from "${vendor}" - No amount, not invoice, not purchase`);
            }
          } catch (parseError) {
            
            // Continue with next email
          }
        }
      } catch (batchError) {
        
        // Continue with next batch
      }
    }
    
          const endTime = Date.now();
      console.log(`✅ Purchase extraction completed: ${purchases.length} purchases found in ${endTime - startTime}ms`);
 
      if (purchases.length === 0) {
        console.log('⚠️ No valid purchases found');
      } else {
        console.log(`📊 Final purchases summary:`, purchases.map(p => ({
          vendor: p.vendor,
          amount: p.amount,
          date: p.date,
          subject: p.subject
        })));
      }
      
      return purchases;
  } catch (error) {
    
    throw error;
  }
}

// Helper function to determine if email is invoice-related
function isInvoiceRelated(subject: string, body: string): boolean {
  const searchText = `${subject} ${body}`.toLowerCase();
  
  // First check if this is a promotional email
  if (searchText.includes('the best lesson') ||
      searchText.includes('what if you never open') ||
      searchText.includes('this changes everything') ||
      searchText.includes('and it begins') ||
      searchText.includes('what happens when we come together') ||
      searchText.includes('unsubscribe') ||
      searchText.includes('marketing') ||
      searchText.includes('promotion') ||
      searchText.includes('offer') ||
      searchText.includes('deal') ||
      searchText.includes('discount') ||
      searchText.includes('newsletter')) {
    return false; // Not an invoice if it's promotional
  }
  
  const invoiceKeywords = [
    'invoice', 'receipt', 'bill', 'payment', 'transaction', 'order confirmation', 'purchase confirmation',
    'thank you for your order', 'order placed', 'payment successful',
    'delivery confirmation', 'shipped', 'out for delivery', 'order confirmed', 'payment received',
    'total', 'amount', 'price', 'cost', 'worth', 'grand total', 'subtotal',
    'paid', 'due', 'balance', 'statement', 'summary'
  ];
  
  return invoiceKeywords.some(keyword => searchText.includes(keyword));
}

// Helper function to determine if email is purchase-related (more inclusive)
function isPurchaseRelated(subject: string, body: string, vendor: string): boolean {
  const searchText = `${subject} ${body}`.toLowerCase();
  const vendorLower = vendor.toLowerCase();
  
  // Check for known purchase-related vendors
  const purchaseVendors = [
    'amazon', 'flipkart', 'swiggy', 'zomato', 'myntra', 'paytm', 'razorpay',
    'uber', 'ola', 'bookmyshow', 'netflix', 'primevideo', 'hotstar', 'spotify',
    'mcdonalds', 'dominos', 'pizza', 'food', 'restaurant', 'delivery'
  ];
  
  if (purchaseVendors.some(v => vendorLower.includes(v))) {
    return true;
  }
  
  // Check for purchase-related keywords in subject/body
  const purchaseKeywords = [
    'order', 'purchase', 'booking', 'ticket', 'delivery', 'confirmation',
    'transaction', 'payment', 'paid', 'successful', 'completed',
    'thank you', 'your order', 'order placed', 'order confirmed'
  ];
  
  return purchaseKeywords.some(keyword => searchText.includes(keyword));
}

// Helper function to extract amount from subject line patterns
function extractAmountFromSubject(subject: string): string {
  // Additional patterns for subject lines
  const subjectPatterns = [
    /worth\s*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /for\s*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /₹\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*worth/gi,
    /₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /Rs\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /INR\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*\/-/gi,
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*only/gi,
  ];

  for (const pattern of subjectPatterns) {
    const match = subject.match(pattern);
    if (match) {
      const numericMatch = match[0].match(/([0-9,]+(?:\.[0-9]{1,2})?)/);
      if (numericMatch) {
        const amount = numericMatch[1].replace(/,/g, '');
        const numAmount = parseFloat(amount);
        if (!isNaN(numAmount) && numAmount > 0) {
          return `₹${numAmount}`;
        }
      }
    }
  }
  
  return 'N/A';
}

// Function to store purchase in database
// async function storePurchaseInDatabase(supabase: any, userId: string, purchase: any) {
//   try {
//     // Skip database storage for now to avoid connection issues
//     
//     return;
//     
//     const { data, error } = await supabase
//       .from('purchases')
//       .upsert({
//         user_id: userId,
//         vendor: purchase.vendor,
//         amount: purchase.amount,
//         date: new Date(purchase.date).toISOString().split('T')[0],
//         subject: purchase.subject,
//         email_id: purchase.messageId,
//         has_invoice: purchase.isInvoice,
//         created_at: new Date().toISOString(),
//         updated_at: new Date().toISOString(),
//       }, {
//         onConflict: 'email_id'
//       });

//     if (error) {
//       
//     } else {
//       
//     }
//   } catch (error) {
//     
//   }
// }

// Enhanced extractRefunds function with broader search
export async function extractRefunds() {
  try {

    // Get user session for database operations
    const session = await getServerSession(authOptions) as ExtendedSession | null;
    const userId = session?.user?.email;
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    // Initialize Supabase client
    const supabase = createServerClient();
    
    // Search for refund-related emails with broader scope
    const searchQueries = [
      'subject:(refund OR return OR cancellation OR cancel OR "money back" OR "cash back")',
      'subject:(replacement OR exchange OR "return policy" OR "refund policy")',
      'subject:(damaged OR defective OR broken OR faulty OR "not working")',
      'subject:(warranty OR guarantee OR protection OR extended)',
      'body:(refund OR return OR cancellation OR cancel OR "money back" OR "cash back")',
      'body:(replacement OR exchange OR "return policy" OR "refund policy")',
      'body:(damaged OR defective OR broken OR faulty OR "not working")',
    ];
    
    const allMessages = [];
    for (const query of searchQueries) {
      try {
        const results = await searchEmails(`label:INBOX ${query}`, 30);
        allMessages.push(...results);
      } catch (err) {
        
      }
    }
    
    // Remove duplicates
    const uniqueMessages = allMessages.filter((msg, index, self) => 
      index === self.findIndex(m => m.id === msg.id)
    );
    
    const refundOpportunities = [];
    const completedRefunds = [];

    for (const message of uniqueMessages) {
      const email = await getEmailDetails(message.id!);
      const parsed = parseEmailContent(email);
      
      // Extract amount from both subject and body
      const searchText = `${parsed.subject} ${parsed.body}`;
      const amount = extractAmount(searchText);
      
      // Clean up vendor name
      let vendor = parsed.from.split('<')[0].trim();
      if (vendor.includes('"')) {
        vendor = vendor.replace(/"/g, '').trim();
      }
      
      // Determine if it's a refund opportunity or completed refund
      const isCompleted = searchText.toLowerCase().includes('refunded') || 
                         searchText.toLowerCase().includes('returned') ||
                         searchText.toLowerCase().includes('cancelled') ||
                         searchText.toLowerCase().includes('processed') ||
                         searchText.toLowerCase().includes('completed');
      
      const refundData = {
        id: message.id,
        item: parsed.subject,
        reason: isCompleted ? 'Refund processed' : 'Eligible for refund',
        amount,
        daysLeft: isCompleted ? 0 : 30, // Default 30 days instead of random mock data
        status: isCompleted ? 'completed' : 'eligible',
        date: parsed.date,
        vendor,
      };
      
      if (isCompleted) {
        completedRefunds.push(refundData);
      } else {
        refundOpportunities.push(refundData);
      }
      
      // Database storage disabled to prevent connection errors
      // try {
      //   if (isCompleted) {
      //     await storeCompletedRefundInDatabase(supabase, userId, refundData);
      //   } else {
      //     await storeRefundOpportunityInDatabase(supabase, userId, refundData);
      //   }
      // } catch (dbError) {
      //   
      // }
    }

    return {
      refundOpportunities,
      completedRefunds,
    };
  } catch (error) {
    
    throw error;
  }
}

// Database storage functions disabled to prevent connection errors
// async function storeRefundOpportunityInDatabase(supabase: any, userId: string, refund: any) {
//   try {
//     const { data, error } = await supabase
//       .from('refund_opportunities')
//       .upsert({
//         user_id: userId,
//         item: refund.item,
//         reason: refund.reason,
//         amount: refund.amount,
//         days_left: refund.daysLeft,
//         status: refund.status,
//         created_at: new Date().toISOString(),
//       }, {
//         onConflict: 'id'
//       });

//     if (error) {
//       
//     }
//   } catch (error) {
//     
//   }
// }

// async function storeCompletedRefundInDatabase(supabase: any, userId: string, refund: any) {
//   try {
//     const { data, error } = await supabase
//       .from('completed_refunds')
//       .upsert({
//         user_id: userId,
//         item: refund.item,
//         amount: refund.amount,
//         date: new Date(refund.date).toISOString().split('T')[0],
//         status: refund.status,
//         created_at: new Date().toISOString(),
//       }, {
//         onConflict: 'id'
//       });

//     if (error) {
//       
//     }
//   } catch (error) {
//     
//   }
// }

// Enhanced extractWarranties function with broader search
export async function extractWarranties() {
  try {

    // Get user session for database operations
    const session = await getServerSession(authOptions) as ExtendedSession | null;
    const userId = session?.user?.email;
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    // Initialize Supabase client
    const supabase = createServerClient();
    
    // Search for warranty-related emails with broader scope
    const searchQueries = [
      'subject:(warranty OR guarantee OR protection OR extended OR "extended warranty")',
      'subject:(repair OR service OR maintenance OR "service center")',
      'subject:(claim OR "warranty claim" OR "service request")',
      'subject:(electronics OR appliance OR gadget OR device)',
      'body:(warranty OR guarantee OR protection OR extended OR "extended warranty")',
      'body:(repair OR service OR maintenance OR "service center")',
      'body:(claim OR "warranty claim" OR "service request")',
    ];
    
    const allMessages = [];
    for (const query of searchQueries) {
      try {
        const results = await searchEmails(`label:INBOX ${query}`, 30);
        allMessages.push(...results);
      } catch (err) {
        
      }
    }
    
    // Remove duplicates
    const uniqueMessages = allMessages.filter((msg, index, self) => 
      index === self.findIndex(m => m.id === msg.id)
    );
    
    const warranties = [];
    const claims = [];

    for (const message of uniqueMessages) {
      const email = await getEmailDetails(message.id!);
      const parsed = parseEmailContent(email);
      
      // Extract amount from both subject and body
      const searchText = `${parsed.subject} ${parsed.body}`;
      const coverage = extractAmount(searchText);
      
      // Clean up vendor name
      let vendor = parsed.from.split('<')[0].trim();
      if (vendor.includes('"')) {
        vendor = vendor.replace(/"/g, '').trim();
      }
      
      // Determine warranty status
      const isExpired = searchText.toLowerCase().includes('expired') || 
                       searchText.toLowerCase().includes('expiry');
      const isExpiring = searchText.toLowerCase().includes('expiring') ||
                        searchText.toLowerCase().includes('expires');
      
      let status = 'active';
      if (isExpired) status = 'expired';
      else if (isExpiring) status = 'expiring';
      
      // Calculate days left (mock data)
      const daysLeft = isExpired ? 0 : Math.floor(Math.random() * 365) + 1;
      
      const warrantyData = {
        id: message.id,
        item: parsed.subject,
        coverage,
        expiryDate: new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000).toISOString(),
        daysLeft,
        status,
        type: 'Standard Warranty',
        vendor,
      };
      
      // Check if it's a warranty claim
      const isClaim = searchText.toLowerCase().includes('claim') ||
                     searchText.toLowerCase().includes('repair') ||
                     searchText.toLowerCase().includes('service');
      
      if (isClaim) {
        claims.push({
          id: message.id,
          item: parsed.subject,
          amount: coverage,
          date: parsed.date,
          status: 'processing',
        });
      } else {
        warranties.push(warrantyData);
      }
      
      // Database storage disabled to prevent connection errors
      // try {
      //   if (isClaim) {
      //     await storeWarrantyClaimInDatabase(supabase, userId, {
      //       id: message.id,
      //       item: parsed.subject,
      //       amount: coverage,
      //       date: parsed.date,
      //       status: 'processing',
      //     });
      //   } else {
      //     await storeWarrantyInDatabase(supabase, userId, warrantyData);
      //   }
      // } catch (dbError) {
      //   
      // }
    }

    return {
      warranties,
      claims,
    };
  } catch (error) {
    
    throw error;
  }
}

// Lightweight types for dashboard email consumption
export type GmailEmail = {
  id: string;
  messageId: string;
  date: string;
  subject: string;
  from: string;
  vendor: string;
  amount: string; // Keep as formatted string for UI compatibility (e.g., ₹123.45)
  isInvoice: boolean;
};

// Minimal header parsing for speed (SSR)
function parseHeaders(email: any) {
  const headers = email.payload?.headers || [];
  const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
  const from = headers.find((h: any) => h.name === 'From')?.value || '';
  const date = headers.find((h: any) => h.name === 'Date')?.value || '';
  return { subject, from, date };
}

function basicAmountExtract(text: string): string {
  const patterns = [
    /₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/g,
    /INR\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /Rs\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /\$\s*([0-9,]+(?:\.[0-9]{1,2})?)/g,
  ];
  let highest = 0;
  for (const pattern of patterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const m of matches) {
      const num = parseFloat((m[1] || '').replace(/,/g, ''));
      if (!isNaN(num) && num > highest) highest = num;
    }
  }
  return highest > 0 ? `₹${highest}` : '₹0';
}

function extractAmountFromBody(message: any): string {
  try {
    // Extract text content from email body
    let bodyText = '';
    
    if (message.payload?.body?.data) {
      // Simple text email
      bodyText = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    } else if (message.payload?.parts) {
      // Multipart email - look for text parts
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          bodyText = Buffer.from(part.body.data, 'base64').toString('utf-8');
          break;
        }
      }
    }
    
    if (!bodyText) return '₹0';
    
    // Use the same patterns as basicAmountExtract but on the body text
    const patterns = [
      /₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/g,
      /INR\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
      /Rs\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
      /\$\s*([0-9,]+(?:\.[0-9]{1,2})?)/g,
    ];
    
    let highest = 0;
    for (const pattern of patterns) {
      const matches = Array.from(bodyText.matchAll(pattern));
      for (const m of matches) {
        const num = parseFloat((m[1] || '').replace(/,/g, ''));
        if (!isNaN(num) && num > highest) highest = num;
      }
    }
    
    return highest > 0 ? `₹${highest}` : '₹0';
  } catch (error) {
    
    return '₹0';
  }
}

function isLikelyInvoice(subject: string): boolean {
  const s = subject.toLowerCase();
  
  // Exclude promotional keywords
  if (s.includes('unsubscribe') || 
      s.includes('marketing') || 
      s.includes('promotion') || 
      s.includes('offer') || 
      s.includes('deal') || 
      s.includes('discount') || 
      s.includes('newsletter') ||
      s.includes('what if') ||
      s.includes('the best lesson') ||
      s.includes('this changes everything') ||
      s.includes('and it begins')) {
    return false;
  }
  
  return (
    s.includes('invoice') ||
    s.includes('receipt') ||
    s.includes('order confirmation') ||
    s.includes('order delivered') ||
    s.includes('purchase confirmation') ||
    s.includes('payment confirmation') ||
    s.includes('payment of') ||
    s.includes('bill') ||
    s.includes('delivery confirmation') ||
    s.includes('order shipped')
  );
}

// NEW: Check if email is from a known invoice-sending vendor
function isInvoiceFromVendor(vendor: string): boolean {
  const vendorLower = vendor.toLowerCase();
  const invoiceVendors = [
    'amazon', 'flipkart', 'myntra', 'swiggy', 'zomato', 'paytm', 'razorpay',
    'uber', 'ola', 'bookmyshow', 'netflix', 'hotstar', 'spotify', 'google',
    'apple', 'microsoft', 'adobe', 'salesforce', 'shopify', 'stripe'
  ];
  
  return invoiceVendors.some(invoiceVendor => vendorLower.includes(invoiceVendor));
}

// NEW: Check if email content suggests it's an invoice
function isInvoiceFromContent(subject: string, bodyAmount: string): boolean {
  const subjectLower = subject.toLowerCase();
  const hasAmount = bodyAmount !== '₹0';
  
  // If it has an amount and mentions common invoice terms
  if (hasAmount && (
    subjectLower.includes('total') ||
    subjectLower.includes('amount') ||
    subjectLower.includes('paid') ||
    subjectLower.includes('charge') ||
    subjectLower.includes('cost')
  )) {
    return true;
  }
  
  return false;
}

// NEW: Extract amount based on vendor patterns
function extractAmountFromVendor(vendor: string, subject: string): string {
  const vendorLower = vendor.toLowerCase();
  const subjectLower = subject.toLowerCase();
  
  // Facebook notifications often have amounts
  if (vendorLower.includes('facebook') && subjectLower.includes('notifications')) {
    const amountMatch = subject.match(/₹(\d+)/);
    if (amountMatch) {
      return `₹${amountMatch[1]}`;
    }
  }
  
  // Myntra, Zomato, etc. - look for common patterns
  if (vendorLower.includes('myntra') || vendorLower.includes('zomato')) {
    const amountMatch = subject.match(/₹(\d+)/);
    if (amountMatch) {
      return `₹${amountMatch[1]}`;
    }
  }
  
  return '₹0';
}

function cleanVendor(from: string): string {
  const namePart = from.split('<')[0].trim();
  const cleaned = namePart.replace(/"/g, '').trim();
  
  // Check if this is a promotional email sender or credit card bank
  const lowerFrom = from.toLowerCase();
  if (lowerFrom.includes('noreply@mailers.zomato.com') || 
      lowerFrom.includes('marketing') || 
      lowerFrom.includes('promotional') ||
      lowerFrom.includes('newsletter') ||
      lowerFrom.includes('mailers.zomato.com') ||
      // EXCLUDE CREDIT CARD BANKS
      lowerFrom.includes('hdfc') ||
      lowerFrom.includes('axisbank') ||
      lowerFrom.includes('axis') ||
      lowerFrom.includes('icici') ||
      lowerFrom.includes('sbi') ||
      lowerFrom.includes('kotak') ||
      lowerFrom.includes('bank') ||
      lowerFrom.includes('credit card') ||
      lowerFrom.includes('statement')) {
    return 'PROMOTIONAL_FILTER'; // Mark as promotional for filtering
  }
  
  return cleaned || 'Unknown';
}

// Fast SSR helper: fetch last N days using Gmail q after: filter
export async function getRecentEmails(days: number = 10, maxResults: number = 30): Promise<GmailEmail[]> {
  const gmail = await getGmailClient();

  const afterDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const yyyy = afterDate.getFullYear();
  const mm = String(afterDate.getMonth() + 1).padStart(2, '0');
  const dd = String(afterDate.getDate()).padStart(2, '0');
  const afterQuery = `${yyyy}/${mm}/${dd}`;

  // Keep the query tight for speed and relevance - NO DATE FILTER
  const q = `in:primary (subject:(invoice OR receipt OR order OR purchase OR payment) OR from:(amazon.in OR flipkart.com OR swiggy.com OR zomato.com OR myntra.com))`;

  // List candidate messages quickly
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q,
    maxResults,
  });

  const messages = listRes.data.messages || [];
  if (!messages.length) return [];

  // Fetch details with modest concurrency for <1s SSR target
  const concurrency = 15;
  const results: GmailEmail[] = [];
  let index = 0;

  async function worker() {
    while (index < messages.length) {
      const current = index++;
      const id = messages[current]?.id;
      if (!id) continue;
      try {
        // Fetch full message content to extract amounts from body, not just subject
        const res = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
        const { subject, from, date } = parseHeaders(res.data);
        
        // Extract amount from both subject and body for better accuracy
        const subjectAmount = basicAmountExtract(subject);
        const bodyAmount = extractAmountFromBody(res.data);
        
        // Use body amount if available, fallback to subject amount
        const amount = bodyAmount !== '₹0' ? bodyAmount : subjectAmount;
        
        results.push({
          id: res.data.id || id,
          messageId: res.data.id || id,
          date: date || new Date().toISOString(),
          subject,
          from,
          vendor: cleanVendor(from),
          amount,
          isInvoice: isLikelyInvoice(subject),
        });
      } catch (e) {
        // skip
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, messages.length) }, () => worker());
  await Promise.all(workers);

  // Sort newest first
  results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return results;
}

// Background CSR helper via API: fetch emails older than a cutoff using before:
export async function getOlderEmails(
  beforeDate: Date,
  pageSize: number = 50,
  pageToken?: string
): Promise<{ emails: GmailEmail[]; nextPageToken?: string }> {
  const gmail = await getGmailClient();

  const beforeDateStr = beforeDate.toISOString().split('T')[0];
  const q = `in:primary (subject:(invoice OR receipt OR order OR purchase OR payment) OR from:(amazon.in OR flipkart.com OR swiggy.com OR zomato.com OR myntra.com))`;

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q,
    maxResults: pageSize,
    pageToken,
  });

  const messages = listRes.data.messages || [];
  if (!messages.length) return { emails: [] };

  // Higher concurrency for background processing
  const concurrency = 15;
  const results: GmailEmail[] = [];
  let index = 0;

  async function worker() {
    while (index < messages.length) {
      const current = index++;
      const id = messages[current]?.id;
      if (!id) continue;
      try {
        const res = await gmail.users.messages.get({ userId: 'me', id, format: 'metadata', metadataHeaders: ['Subject', 'From', 'Date'] });
        const { subject, from, date } = parseHeaders(res.data);
        const amount = basicAmountExtract(subject);
        results.push({
          id: res.data.id || id,
          messageId: res.data.id || id,
          date: date || new Date().toISOString(),
          subject,
          from,
          vendor: cleanVendor(from),
          amount,
          isInvoice: isLikelyInvoice(subject),
        });
      } catch (e) {
        // skip
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, messages.length) }, () => worker());
  await Promise.all(workers);

  const nextToken = typeof listRes.data.nextPageToken === 'string' ? listRes.data.nextPageToken : undefined;
  return { emails: results, nextPageToken: nextToken };
}

// NEW: Extract invoices specifically with PDF attachments
export async function extractInvoicesWithAttachments(days: number = 30): Promise<any[]> {
  const gmail = await getGmailClient();
  console.log('📄 Starting invoice extraction with attachments...');

  // Search for emails with PDF attachments that are likely invoices
  const afterDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const yyyy = afterDate.getFullYear();
  const mm = String(afterDate.getMonth() + 1).padStart(2, '0');
  const dd = String(afterDate.getDate()).padStart(2, '0');
  const afterQuery = `${yyyy}/${mm}/${dd}`;
  
  console.log(`📅 Searching for emails from last ${days} days (since ${afterDate.toISOString().split('T')[0]})`);
  
  // Search for emails that are likely to be invoices/receipts (exclude social media and promotions)
  const query = `in:inbox (invoice OR receipt OR bill OR payment OR order OR booking OR ticket OR confirmation OR "thank you for your order" OR "order confirmation" OR "payment receipt" OR "booking confirmation" OR "ticket confirmation" OR "delivery confirmation" OR "purchase confirmation") -from:facebook.com -from:myntra.com -from:zomato.com -from:naukri.com -from:microsoft.com -subject:"notification" -subject:"commented" -subject:"posted" -subject:"shared" -subject:"sale" -subject:"offer" -subject:"promotion"`;
  
  try {
    console.log('🔍 Searching for purchase-related emails (excluding social media and promotions)...');
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 100, // Increased to get more emails
    });
    
    const messages = listRes.data.messages || [];
    console.log(`📧 Found ${messages.length} purchase-related emails (excluding social media and promotions)`);
    
    if (!messages.length) {
      console.log('📄 No emails found in inbox');
      return [];
    }
    
    // Log first few message IDs for debugging
    console.log(`🔍 First 5 message IDs:`, messages.slice(0, 5).map(m => m.id));

    const invoices: any[] = [];
    let processed = 0;
    
    // Process messages with concurrency control
    const concurrency = 15;
    let index = 0;
    
    async function worker() {
      while (index < messages.length) {
        const current = index++;
        const id = messages[current]?.id;
        if (!id) continue;
        
        try {
          console.log(`🔍 Processing email ${current + 1}/${messages.length}: ${id}`);
          
          const res = await gmail.users.messages.get({
            userId: 'me',
            id,
            format: 'full',
          });
          
          const { subject, from, date } = parseHeaders(res.data);
          const vendor = cleanVendor(from);
          
          // Filter by date in code
          const emailDate = new Date(date);
          const isWithinDateRange = emailDate >= afterDate;
          
          if (!isWithinDateRange) {
            console.log(`📅 Skipping email from ${emailDate.toISOString()} (older than ${days} days) - Subject: "${subject}"`);
            continue;
          }
          
          // Get full email body for analysis
          const emailBody = getEmailBody(res.data);
          const fullText = `${subject} ${emailBody}`.toLowerCase();
          
          // First, exclude junk emails
          const isJunkEmail = fullText.includes('facebook') ||
                            fullText.includes('notification') ||
                            fullText.includes('commented') ||
                            fullText.includes('posted') ||
                            fullText.includes('shared') ||
                            fullText.includes('sale') ||
                            fullText.includes('offer') ||
                            fullText.includes('promotion') ||
                            fullText.includes('friend suggestion') ||
                            fullText.includes('story') ||
                            fullText.includes('timeline') ||
                            vendor.toLowerCase().includes('facebook') ||
                            vendor.toLowerCase().includes('myntra') ||
                            vendor.toLowerCase().includes('zomato') ||
                            vendor.toLowerCase().includes('naukri') ||
                            vendor.toLowerCase().includes('microsoft');
          
          if (isJunkEmail) {
            console.log(`🚫 Skipping junk email from ${vendor} - Subject: "${subject}"`);
            continue;
          }
          
          // Enhanced invoice detection - check for purchase-related keywords
          const isInvoiceEmail = fullText.includes('invoice') ||
                               fullText.includes('receipt') ||
                               fullText.includes('bill') ||
                               fullText.includes('payment') ||
                               fullText.includes('order') ||
                               fullText.includes('booking') ||
                               fullText.includes('ticket') ||
                               fullText.includes('confirmation') ||
                               fullText.includes('transaction') ||
                               fullText.includes('amount') ||
                               fullText.includes('₹') ||
                               fullText.includes('rupees') ||
                               fullText.includes('total') ||
                               fullText.includes('subtotal') ||
                               fullText.includes('tax') ||
                               fullText.includes('gst') ||
                               fullText.includes('vat') ||
                               fullText.includes('delivery') ||
                               fullText.includes('shipping') ||
                               fullText.includes('flipkart') ||
                               fullText.includes('amazon') ||
                               fullText.includes('swiggy') ||
                               fullText.includes('zomato') ||
                               fullText.includes('myntra') ||
                               fullText.includes('paytm') ||
                               fullText.includes('noreply') ||
                               fullText.includes('orders') ||
                               fullText.includes('billing') ||
                               fullText.includes('support') ||
                               fullText.includes('customer') ||
                               fullText.includes('service') ||
                               fullText.includes('copy') ||
                               fullText.includes('delivery') ||
                               fullText.includes('shipped') ||
                               fullText.includes('dispatched') ||
                               fullText.includes('refund') ||
                               fullText.includes('cancellation') ||
                               fullText.includes('return') ||
                               fullText.includes('exchange') ||
                               fullText.includes('pvrinox') ||
                               fullText.includes('pvr') ||
                               fullText.includes('cinema') ||
                               fullText.includes('movie') ||
                               fullText.includes('booking') ||
                               fullText.includes('ticket') ||
                               fullText.includes('seat') ||
                               fullText.includes('show') ||
                               fullText.includes('theater') ||
                               fullText.includes('theatre');
          
          if (isInvoiceEmail) {
            // Extract attachments if any
            const attachments = extractAttachments(res.data).filter(att => 
              att.mimeType === 'application/pdf' ||
              att.mimeType === 'image/jpeg' ||
              att.mimeType === 'image/png' ||
              att.mimeType === 'image/jpg' ||
              att.mimeType === 'application/msword' ||
              att.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
              att.mimeType === 'application/vnd.ms-excel' ||
              att.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
              att.mimeType === 'text/plain' ||
              att.mimeType === 'application/octet-stream'
            );
            
            console.log(`📄 Found ${attachments.length} attachment(s) in email from ${vendor}`);
            console.log(`🔍 Invoice detection for ${vendor}: Subject="${subject}", Body contains invoice keywords: ${isInvoiceEmail}`);
            
            // Extract amount from subject or body
            const subjectAmount = basicAmountExtract(subject);
            const bodyAmount = extractAmountFromBody(res.data);
            const amount = bodyAmount !== '₹0' ? bodyAmount : subjectAmount;
            
            // Create invoice entry (with or without attachments)
            const invoice = {
              id: id,
              messageId: id,
              vendor: vendor,
              amount: amount,
              date: date || new Date().toISOString(),
              subject: subject || 'Invoice',
              isInvoice: true,
              hasAttachment: attachments.length > 0,
              attachmentCount: attachments.length,
              attachmentDetails: attachments.length > 0 ? {
                filename: attachments[0].filename || `${vendor}_invoice.pdf`,
                mimeType: attachments[0].mimeType,
                size: attachments[0].size || 0,
                attachmentId: attachments[0].attachmentId,
              } : null,
              emailFrom: from,
              emailDate: date,
              confidence: 0.9,
              source: attachments.length > 0 ? 'gmail-pdf-attachment' : 'gmail-text-invoice'
            };
            
            console.log(`✅ Extracted invoice: ${vendor} - ${amount} (${attachments.length > 0 ? 'with attachments' : 'text only'})`);
            invoices.push(invoice);
          } else {
            console.log(`📄 No invoice keywords found in email from ${vendor} - Subject: "${subject}"`);
          }
          
          processed++;
          if (processed % 5 === 0) {
            console.log(`📄 Processed ${processed}/${messages.length} emails...`);
          }
          
        } catch (error) {
          console.error(`❌ Error processing email ${id}:`, error);
        }
      }
    }
    
    // Start workers
    const workers = Array.from({ length: Math.min(concurrency, messages.length) }, () => worker());
    await Promise.all(workers);
    
    console.log(`✅ Extracted ${invoices.length} invoices with PDF attachments from ${processed} emails`);
    return invoices;
    
  } catch (error) {
    console.error('❌ Error extracting invoices with attachments:', error);
    return [];
  }
}

// NEW: Extract real documents with attachments from Gmail
export async function extractDocumentsWithAttachments(days: number = 30): Promise<any[]> {
  const gmail = await getGmailClient();

  // FIXED: Search for emails with attachments without date filter first
  const afterDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const yyyy = afterDate.getFullYear();
  const mm = String(afterDate.getMonth() + 1).padStart(2, '0');
  const dd = String(afterDate.getDate()).padStart(2, '0');
  const afterQuery = `${yyyy}/${mm}/${dd}`;
  
  // AGGRESSIVE: Exclude promotional emails and focus on actual purchase receipts
  // EXCLUDE CREDIT CARD STATEMENTS - Focus on email parsing only
  const query = `in:inbox has:attachment -is:promotional -is:marketing -subject:("unsubscribe" OR "marketing" OR "promotion" OR "offer" OR "deal" OR "discount" OR "newsletter" OR "the best lesson" OR "what if you never open" OR "this changes everything" OR "and it begins" OR "what happens when we come together" OR "credit card" OR "statement" OR "bank" OR "hdfc" OR "axis" OR "icici" OR "sbi" OR "kotak") -from:("noreply@mailers.zomato.com" OR "mailers.zomato.com" OR "hdfc" OR "axisbank" OR "icici" OR "sbi" OR "kotak" OR "bank") (subject:(invoice OR receipt OR "order confirmation" OR "purchase confirmation" OR "payment confirmation" OR "delivery confirmation" OR "order delivered" OR "order shipped" OR "bill" OR "transaction" OR "payment of" OR "amount paid") OR from:(amazon.in OR flipkart.com OR swiggy.com OR myntra.com OR paytm.com OR razorpay.com OR "noreply@swiggy.com" OR "noreply@amazon.in" OR "noreply@flipkart.com" OR "orders@swiggy.com" OR "orders@amazon.in" OR "orders@flipkart.com"))`;
  
  try {
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 50, // Limit for performance
    });
    
    const messages = listRes.data.messages || [];
    if (!messages.length) {
      
      return [];
    }

    const documents: any[] = [];
    let processed = 0;
    
    // Process messages with concurrency control
    const concurrency = 15;
    let index = 0;
    
    async function worker() {
      while (index < messages.length) {
        const current = index++;
        const id = messages[current]?.id;
        if (!id) continue;
        
        try {
          const res = await gmail.users.messages.get({
            userId: 'me',
            id,
            format: 'full',
          });
          
          const { subject, from, date } = parseHeaders(res.data);
          const vendor = cleanVendor(from);
          
          // Skip promotional vendors
          if (vendor === 'PROMOTIONAL_FILTER') {
            console.log('🚫 FILTERED - Promotional vendor skipped:', from);
            continue;
          }
          
          // EXCLUDE CREDIT CARD STATEMENTS - Additional filtering
          const subjectLower = subject.toLowerCase();
          const fromLower = from.toLowerCase();
          
          // Skip credit card related emails
          if (subjectLower.includes('credit card') ||
              subjectLower.includes('statement') ||
              subjectLower.includes('hdfc') ||
              subjectLower.includes('axis') ||
              subjectLower.includes('icici') ||
              subjectLower.includes('sbi') ||
              subjectLower.includes('kotak') ||
              subjectLower.includes('bank') ||
              fromLower.includes('hdfc') ||
              fromLower.includes('axisbank') ||
              fromLower.includes('icici') ||
              fromLower.includes('sbi') ||
              fromLower.includes('kotak') ||
              fromLower.includes('bank')) {
            console.log('🚫 FILTERED - Credit card email skipped:', subject, 'from:', from);
            continue;
          }
          
          // Additional check for promotional subjects
          if (subjectLower.includes('the best lesson') ||
              subjectLower.includes('what if you never open') ||
              subjectLower.includes('this changes everything') ||
              subjectLower.includes('and it begins') ||
              subjectLower.includes('what happens when we come together') ||
              subjectLower.includes('unsubscribe') ||
              subjectLower.includes('marketing') ||
              subjectLower.includes('promotion') ||
              subjectLower.includes('offer') ||
              subjectLower.includes('deal') ||
              subjectLower.includes('discount') ||
              subjectLower.includes('newsletter')) {
            console.log('🚫 FILTERED - Promotional subject skipped:', subject);
            continue;
          }
          
          // FIXED: Filter by date in code instead of Gmail query
          const emailDate = new Date(date);
          const isWithinDateRange = emailDate >= afterDate;
          
          if (!isWithinDateRange) {
            
            continue;
          }
          
          // Extract attachments
          const attachments = extractAttachments(res.data);
          
          if (attachments.length > 0) {
            // Extract amount from subject or body
            const subjectAmount = basicAmountExtract(subject);
            const bodyAmount = extractAmountFromBody(res.data);
            const amount = bodyAmount !== '₹0' ? bodyAmount : subjectAmount;
            
            // Create document entries for each attachment
            attachments.forEach((attachment, attIndex) => {
              const documentType = determineDocumentType(subject, attachment.mimeType);
              
              // Skip promotional documents
              if (documentType === 'promotional') {
                console.log('🚫 FILTERED - Promotional email skipped:', subject);
                return;
              }
              
              const document = {
                id: `${id}-${attIndex}`,
                messageId: id,
                name: attachment.filename || `${vendor}_${attachment.mimeType?.split('/')[1] || 'attachment'}_${attIndex + 1}`,
                title: subject || 'Document',
                type: documentType,
                amount: amount,
                date: date || new Date().toISOString(),
                vendor: vendor,
                category: determineCategory(vendor, subject),
                size: formatFileSize(attachment.size || 0),
                mimeType: attachment.mimeType || 'application/octet-stream',
                emailSubject: subject,
                emailFrom: from,
                emailDate: date,
                attachmentId: attachment.attachmentId,
                isPdf: attachment.mimeType === 'application/pdf',
                isInvoice: isLikelyInvoice(subject),
              };
              
              documents.push(document);
            });
          }
          
          processed++;
          if (processed % 10 === 0) {
            
          }
          
        } catch (error) {
          
        }
      }
    }
    
    const workers = Array.from({ length: Math.min(concurrency, messages.length) }, () => worker());
    await Promise.all(workers);

    return documents;
    
  } catch (error) {
    console.error('❌ GMAIL ERROR - extractDocumentsWithAttachments failed:', error);
    console.error('❌ GMAIL ERROR - Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return [];
  }
}

// Helper function to extract attachments from Gmail message
function extractAttachments(message: any): any[] {
  const attachments: any[] = [];
  
  function processPart(part: any) {
    if (part.body?.attachmentId) {
      // This is an attachment
      attachments.push({
        attachmentId: part.body.attachmentId,
        filename: part.filename || 'attachment',
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body.size || 0,
      });
    }
    
    // Recursively process nested parts
    if (part.parts) {
      part.parts.forEach(processPart);
    }
  }
  
  if (message.payload) {
    processPart(message.payload);
  }
  
  return attachments;
}

// Helper function to determine document type
function determineDocumentType(subject: string, mimeType?: string): string {
  const subjectLower = subject.toLowerCase();
  
  // Skip promotional emails
  if (subjectLower.includes('unsubscribe') || 
      subjectLower.includes('marketing') || 
      subjectLower.includes('promotion') || 
      subjectLower.includes('offer') || 
      subjectLower.includes('deal') || 
      subjectLower.includes('discount') || 
      subjectLower.includes('newsletter') ||
      subjectLower.includes('what if') ||
      subjectLower.includes('the best lesson') ||
      subjectLower.includes('this changes everything') ||
      subjectLower.includes('and it begins')) {
    return 'promotional'; // Mark as promotional to filter out later
  }
  
  if (mimeType === 'application/pdf') {
    if (subjectLower.includes('invoice')) return 'invoice';
    if (subjectLower.includes('receipt')) return 'receipt';
    if (subjectLower.includes('order confirmation') || subjectLower.includes('order delivered')) return 'order';
    if (subjectLower.includes('purchase confirmation')) return 'purchase';
    if (subjectLower.includes('payment confirmation') || subjectLower.includes('payment of')) return 'payment';
  }
  
  if (subjectLower.includes('invoice')) return 'invoice';
  if (subjectLower.includes('receipt')) return 'receipt';
  if (subjectLower.includes('order confirmation') || subjectLower.includes('order delivered')) return 'order';
  if (subjectLower.includes('purchase confirmation')) return 'purchase';
  if (subjectLower.includes('payment confirmation') || subjectLower.includes('payment of')) return 'payment';
  
  return 'document';
}

// Helper function to determine category
function determineCategory(vendor: string, subject: string): string {
  const vendorLower = vendor.toLowerCase();
  const subjectLower = subject.toLowerCase();
  
  if (vendorLower.includes('swiggy') || vendorLower.includes('zomato') || subjectLower.includes('food')) return 'Food';
  if (vendorLower.includes('amazon') || subjectLower.includes('electronics')) return 'Electronics';
  if (vendorLower.includes('flipkart') || subjectLower.includes('fashion')) return 'Fashion';
  if (vendorLower.includes('paytm') || subjectLower.includes('payment')) return 'Payment';
  
  return 'Other';
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Function to store warranty in database
// async function storeWarrantyInDatabase(supabase: any, userId: string, warranty: any) {
//   try {
//     const { data, error } = await supabase
//       .from('warranties')
//       .upsert({
//         user_id: userId,
//         item: warranty.item,
//         coverage: warranty.coverage,
//         expiry_date: warranty.expiryDate.split('T')[0],
//         days_left: warranty.daysLeft,
//         status: warranty.status,
//         type: warranty.type,
//         created_at: new Date().toISOString(),
//       }, {
//         onConflict: 'id'
//       });

//     if (error) {
//       
//     }
//   } catch (error) {
//     
//   }
// }

// Function to store warranty claim in database
// async function storeWarrantyClaimInDatabase(supabase: any, userId: string, claim: any) {
//   try {
//     const { data, error } = await supabase
//       .from('warranty_claims')
//       .upsert({
//         user_id: userId,
//         item: claim.item,
//         amount: claim.amount,
//         date: new Date(claim.date).toISOString().split('T')[0],
//         status: claim.status,
//         created_at: new Date().toISOString(),
//       }, {
//         onConflict: 'id'
//       });

//     if (error) {
//       
//     }
//   } catch (error) {
//     
//   }
// }

// Download attachment from Gmail
export async function downloadAttachment(messageId: string, attachmentId: string): Promise<{
  data: Buffer;
  mimeType: string;
  filename: string;
}> {
  try {
    console.log('🔍 DOWNLOAD DEBUG - Starting download:', {
      messageId,
      attachmentId,
      messageIdLength: messageId?.length,
      attachmentIdLength: attachmentId?.length
    });
    
    const gmail = await getGmailClient();
    
    // Get attachment data
    const res = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId,
    });

    const data = res.data.data;
    if (!data) {
      throw new Error('No attachment data found');
    }

    // Get message details to find attachment info
    const messageRes = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
    });

    const message = messageRes.data;
    const payload = message.payload;
    
    // Find the attachment in the message parts
    let attachmentInfo = { filename: 'attachment', mimeType: 'application/octet-stream' };
    
    if (payload?.parts) {
      for (const part of payload.parts) {
        if (part.body?.attachmentId === attachmentId) {
          attachmentInfo = {
            filename: part.filename || 'attachment',
            mimeType: part.mimeType || 'application/octet-stream'
          };
          break;
        }
      }
    }

    return {
      data: Buffer.from(data, 'base64'),
      mimeType: attachmentInfo.mimeType,
      filename: attachmentInfo.filename
    };

  } catch (error: any) {
    console.error('Error downloading attachment:', error);
    throw new Error(`Failed to download attachment: ${error.message}`);
  }
}

// FIXED: Simple function to get last 7 days of invoice emails from primary inbox
export async function getLast7DaysInvoices(maxResults: number = 50): Promise<GmailEmail[]> {
  try {
    
    const startTime = Date.now();
    
    const gmail = await getGmailClient();
    
    // Calculate 7 days ago - FIXED DATE CALCULATION
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // FIXED: Start with the most basic query that should work
    let messages: any[] = [];
    
    // Test 1: Use working query pattern - inbox instead of primary
    try {
      
      const inboxRes = await gmail.users.messages.list({
        userId: 'me',
        q: 'in:inbox', // This works based on debug results
        maxResults: 50
      });
      messages = inboxRes.data.messages || [];
      
    } catch (error) {

      // Fallback to basic query
      try {
        
        const basicRes = await gmail.users.messages.list({
          userId: 'me',
          maxResults: 50
        });
        messages = basicRes.data.messages || [];
        
      } catch (fallbackError) {
        
      }
    }
    
    // FIXED: Skip Gmail filters since they don't work with this account
    // Just use the basic query results and filter in code

    if (!messages.length) {
      
      return [];
    }

    // Process messages to get details
    const results: GmailEmail[] = [];
    let processed = 0;
    
    // Process with concurrency for speed
    const concurrency = 15;
    let index = 0;
    
    async function worker() {
      while (index < messages.length) {
        const current = index++;
        const id = messages[current]?.id;
        if (!id) continue;
        
        try {
          // Get full message content
          const res = await gmail.users.messages.get({ 
            userId: 'me', 
            id, 
            format: 'full' 
          });
          
          const { subject, from, date } = parseHeaders(res.data);
          
          // FIXED: Filter by date in code instead of Gmail query
          const emailDate = new Date(date);
          const isWithin7Days = emailDate >= sevenDaysAgo;
          
          if (!isWithin7Days) {
            
            continue;
          }
          
          // Extract amount from both subject and body
          const subjectAmount = basicAmountExtract(subject);
          const bodyAmount = extractAmountFromBody(res.data);
          const amount = bodyAmount !== '₹0' ? bodyAmount : subjectAmount;
          
          // Clean vendor name
          const vendor = cleanVendor(from);
          
          // IMPROVED: Better invoice detection
          const isInvoice = isLikelyInvoice(subject) || isInvoiceFromVendor(vendor) || isInvoiceFromContent(subject, bodyAmount);
          
          // IMPROVED: Better amount extraction
          const finalAmount = amount !== '₹0' ? amount : extractAmountFromVendor(vendor, subject);
          
          results.push({
            id: res.data.id || id,
            messageId: res.data.id || id,
            date: date || new Date().toISOString(),
            subject,
            from,
            vendor,
            amount: finalAmount,
            isInvoice,
          });
          
          processed++;
          if (processed % 10 === 0) {
            
          }
          
        } catch (error) {
          
        }
      }
    }
    
    const workers = Array.from({ length: Math.min(concurrency, messages.length) }, () => worker());
    await Promise.all(workers);
    
    // Sort by date (newest first)
    results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const endTime = Date.now();

    // Log summary
    if (results.length > 0) {
      const totalAmount = results.reduce((sum, email) => {
        const amount = parseFloat(email.amount.replace(/[₹,]/g, '')) || 0;
        return sum + amount;
      }, 0);
      
    } else {
      
    }
    
    return results;
    
  } catch (error) {
    
    throw error;
  }
}

// Function to extract email body text
function getEmailBody(message: any): string {
  try {
    const payload = message.payload;
    if (!payload) return '';
    
    let body = '';
    
    // Handle multipart messages
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
          if (part.body && part.body.data) {
            const decoded = Buffer.from(part.body.data, 'base64').toString('utf-8');
            body += decoded + ' ';
          }
        }
        // Recursively check nested parts
        if (part.parts) {
          for (const subPart of part.parts) {
            if (subPart.mimeType === 'text/plain' || subPart.mimeType === 'text/html') {
              if (subPart.body && subPart.body.data) {
                const decoded = Buffer.from(subPart.body.data, 'base64').toString('utf-8');
                body += decoded + ' ';
              }
            }
          }
        }
      }
    } else if (payload.body && payload.body.data) {
      // Handle single part messages
      const decoded = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      body = decoded;
    }
    
    // Clean up HTML tags if present
    body = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    return body;
  } catch (error) {
    console.error('Error extracting email body:', error);
    return '';
  }
}
